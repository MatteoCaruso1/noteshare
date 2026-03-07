import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// All known lifetime price IDs
const LIFETIME_PRICE_IDS = [
  "price_1Sw8hBGiNcIsULtkxrZRuf6O", // CAD $9.99
  "price_1SwEHaGiNcIsULtkrQuVwm7M", // USD $9.99
  "price_1Sv63tGiNcIsULtk4t3RRrAK", // Old $19.99 CAD
];

// All known subscription price IDs
const SUBSCRIPTION_PRICE_IDS = [
  "price_1SwECHGiNcIsULtk8vfidptO", // CAD $1.99/mo
  "price_1SwEHEGiNcIsULtkXsU7dXl7", // USD $1.99/mo
];

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");

    // If we have a webhook secret, verify the signature
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    let event: Stripe.Event;

    if (webhookSecret && sig) {
      try {
        event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
      } catch (err) {
        logStep("Webhook signature verification failed", { error: String(err) });
        return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
      }
    } else {
      // Fallback: parse body directly (for testing or if no webhook secret configured)
      event = JSON.parse(body) as Stripe.Event;
      logStep("WARNING: No webhook secret configured, processing without signature verification");
    }

    logStep("Event received", { type: event.type, id: event.id });

    // Idempotency check
    const { data: existingEvent } = await supabase
      .from('stripe_processed_events')
      .select('event_id')
      .eq('event_id', event.id)
      .maybeSingle();

    if (existingEvent) {
      logStep("Event already processed, skipping", { eventId: event.id });
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Process checkout.session.completed
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      logStep("Processing checkout.session.completed", {
        sessionId: session.id,
        mode: session.mode,
        paymentStatus: session.payment_status,
        customerId: session.customer,
        metadata: session.metadata,
      });

      // Determine user_id from metadata or customer lookup
      let userId = session.metadata?.user_id || null;
      const stripeCustomerId = typeof session.customer === 'string' ? session.customer : session.customer?.id || null;
      const customerEmail = session.customer_details?.email || session.customer_email || null;

      // If no user_id in metadata, try to resolve from auth.users
      if (!userId && customerEmail) {
        logStep("No user_id in metadata, trying email lookup", { email: customerEmail });
        const { data: userData } = await supabase.auth.admin.listUsers();
        const matchedUser = userData?.users?.find(
          (u: { email?: string }) => u.email?.toLowerCase() === customerEmail.toLowerCase()
        );
        if (matchedUser) {
          userId = matchedUser.id;
          logStep("Resolved user via email", { userId });
        }
      }

      // If still no user_id, try stripe customer metadata
      if (!userId && stripeCustomerId) {
        logStep("Trying Stripe customer metadata lookup");
        try {
          const customer = await stripe.customers.retrieve(stripeCustomerId);
          if (!customer.deleted && customer.metadata?.supabase_user_id) {
            userId = customer.metadata.supabase_user_id;
            logStep("Resolved user via customer metadata", { userId });
          }
        } catch (e) {
          logStep("Customer metadata lookup failed", { error: String(e) });
        }
      }

      // Determine entitlement type
      if (session.mode === 'payment' && session.payment_status === 'paid') {
        // Lifetime payment - check line items
        const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
          expand: ['line_items'],
        });
        const hasLifetimePrice = fullSession.line_items?.data?.some(
          (item: Stripe.LineItem) => LIFETIME_PRICE_IDS.includes(item.price?.id ?? '')
        );

        if (hasLifetimePrice) {
          if (userId) {
            await grantEntitlement(supabase, {
              userId,
              proType: 'lifetime',
              stripeCustomerId,
              checkoutSessionId: session.id,
            });
            logStep("Lifetime entitlement granted", { userId });
          } else {
            // Orphan payment
            await recordOrphanPayment(supabase, {
              sessionId: session.id,
              customerId: stripeCustomerId,
              email: customerEmail,
              amount: session.amount_total,
              currency: session.currency,
            });
            logStep("Orphan lifetime payment recorded", { sessionId: session.id });
          }
        }
      } else if (session.mode === 'subscription') {
        // Subscription - grant entitlement
        const subscriptionId = typeof session.subscription === 'string' 
          ? session.subscription 
          : session.subscription?.id || null;

        if (userId) {
          await grantEntitlement(supabase, {
            userId,
            proType: 'subscription',
            stripeCustomerId,
            checkoutSessionId: session.id,
            subscriptionId,
          });
          logStep("Subscription entitlement granted", { userId });
        } else {
          await recordOrphanPayment(supabase, {
            sessionId: session.id,
            customerId: stripeCustomerId,
            email: customerEmail,
            amount: session.amount_total,
            currency: session.currency,
          });
          logStep("Orphan subscription payment recorded", { sessionId: session.id });
        }
      }

      // Log the purchase event
      await supabase.from('purchase_event_log').insert({
        stripe_event_id: event.id,
        stripe_customer_id: stripeCustomerId,
        user_id: userId,
        checkout_session_id: session.id,
        payment_status: session.payment_status,
        processed: !!userId,
        event_type: event.type,
        error_message: userId ? null : 'Could not resolve user_id',
      });
    }

    // Handle customer.subscription.deleted (cancel entitlement)
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      const stripeCustomerId = typeof subscription.customer === 'string' 
        ? subscription.customer 
        : subscription.customer?.id || null;

      if (stripeCustomerId) {
        // Check if user has lifetime - don't revoke if so
        const { data: entitlement } = await supabase
          .from('user_entitlements')
          .select('pro_type, user_id')
          .eq('stripe_customer_id', stripeCustomerId)
          .maybeSingle();

        if (entitlement && entitlement.pro_type !== 'lifetime') {
          // Check premium override before revoking
          const hasOverride = await hasPremiumOverride(supabase, entitlement.user_id);
          if (hasOverride) {
            logStep("Skipping revocation — user has premium override", { userId: entitlement.user_id });
          } else {
            await supabase
              .from('user_entitlements')
              .update({ is_pro: false, updated_at: new Date().toISOString() })
              .eq('stripe_customer_id', stripeCustomerId);
            logStep("Subscription entitlement revoked", { stripeCustomerId });
          }
        }
      }

      await supabase.from('purchase_event_log').insert({
        stripe_event_id: event.id,
        stripe_customer_id: stripeCustomerId,
        payment_status: 'canceled',
        processed: true,
        event_type: event.type,
      });
    }

    // Handle payment_intent.succeeded (catches delayed 3DS confirmations)
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const stripeCustomerId = typeof paymentIntent.customer === 'string'
        ? paymentIntent.customer
        : paymentIntent.customer?.id || null;

      logStep("Processing payment_intent.succeeded", {
        paymentIntentId: paymentIntent.id,
        customerId: stripeCustomerId,
        amount: paymentIntent.amount,
      });

      // Only act if we can identify the customer and they don't already have an entitlement
      if (stripeCustomerId) {
        const { data: entitlement } = await supabase
          .from('user_entitlements')
          .select('is_pro')
          .eq('stripe_customer_id', stripeCustomerId)
          .maybeSingle();

        if (!entitlement?.is_pro) {
          // Try to find user via customer metadata
          const userId = await resolveUserFromCustomer(stripe, supabase, stripeCustomerId);
          if (userId) {
            // Check if this payment is for a lifetime price via the invoice/checkout
            // For safety, grant subscription type — checkout.session.completed handles lifetime specifically
            logStep("payment_intent.succeeded: user found but entitlement will be granted by checkout.session.completed or invoice.paid", { userId });
          }
        }
      }

      await supabase.from('purchase_event_log').insert({
        stripe_event_id: event.id,
        stripe_customer_id: stripeCustomerId,
        payment_status: 'paid',
        processed: true,
        event_type: event.type,
      });
    }

    // Handle charge.refunded — revoke Pro if lifetime purchase was refunded
    if (event.type === 'charge.refunded') {
      const charge = event.data.object as Stripe.Charge;
      const stripeCustomerId = typeof charge.customer === 'string'
        ? charge.customer
        : charge.customer?.id || null;
      const fullyRefunded = charge.refunded; // true if fully refunded

      logStep("Processing charge.refunded", {
        chargeId: charge.id,
        customerId: stripeCustomerId,
        fullyRefunded,
        amountRefunded: charge.amount_refunded,
      });

      if (stripeCustomerId && fullyRefunded) {
        // Check if this customer has a lifetime entitlement — revoke it
        const { data: entitlement } = await supabase
          .from('user_entitlements')
          .select('pro_type, is_pro')
          .eq('stripe_customer_id', stripeCustomerId)
          .maybeSingle();

        if (entitlement?.is_pro && entitlement.pro_type === 'lifetime') {
          await supabase
            .from('user_entitlements')
            .update({ is_pro: false, updated_at: new Date().toISOString() })
            .eq('stripe_customer_id', stripeCustomerId);
          logStep("Lifetime entitlement revoked due to full refund", { stripeCustomerId });
        }
      }

      await supabase.from('purchase_event_log').insert({
        stripe_event_id: event.id,
        stripe_customer_id: stripeCustomerId,
        payment_status: fullyRefunded ? 'refunded' : 'partially_refunded',
        processed: true,
        event_type: event.type,
      });
    }

    // Handle invoice.paid — activate/renew subscription Pro access
    if (event.type === 'invoice.paid') {
      const invoice = event.data.object as Stripe.Invoice;
      const stripeCustomerId = typeof invoice.customer === 'string'
        ? invoice.customer
        : invoice.customer?.id || null;
      const subscriptionId = typeof invoice.subscription === 'string'
        ? invoice.subscription
        : invoice.subscription?.id || null;

      logStep("Processing invoice.paid", {
        invoiceId: invoice.id,
        customerId: stripeCustomerId,
        subscriptionId,
      });

      if (stripeCustomerId && subscriptionId) {
        const userId = await resolveUserFromCustomer(stripe, supabase, stripeCustomerId);
        if (userId) {
          // Don't downgrade lifetime to subscription
          const { data: existing } = await supabase
            .from('user_entitlements')
            .select('pro_type')
            .eq('user_id', userId)
            .maybeSingle();

          if (existing?.pro_type !== 'lifetime') {
            await grantEntitlement(supabase, {
              userId,
              proType: 'subscription',
              stripeCustomerId,
              checkoutSessionId: invoice.id,
              subscriptionId,
            });
            logStep("Subscription renewed/activated via invoice.paid", { userId });
          }
        }
      }

      await supabase.from('purchase_event_log').insert({
        stripe_event_id: event.id,
        stripe_customer_id: stripeCustomerId,
        payment_status: 'paid',
        processed: true,
        event_type: event.type,
      });
    }

    // Handle invoice.payment_failed — log but do NOT revoke access yet
    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice;
      const stripeCustomerId = typeof invoice.customer === 'string'
        ? invoice.customer
        : invoice.customer?.id || null;

      logStep("Processing invoice.payment_failed", {
        invoiceId: invoice.id,
        customerId: stripeCustomerId,
        attemptCount: invoice.attempt_count,
      });

      // Do NOT revoke access here — Stripe will send customer.subscription.deleted
      // if the subscription actually cancels after retry exhaustion
      await supabase.from('purchase_event_log').insert({
        stripe_event_id: event.id,
        stripe_customer_id: stripeCustomerId,
        payment_status: 'payment_failed',
        processed: true,
        event_type: event.type,
        error_message: `Payment attempt ${invoice.attempt_count} failed`,
      });
    }

    // Handle customer.subscription.created — grant Pro for new subscriptions
    if (event.type === 'customer.subscription.created') {
      const subscription = event.data.object as Stripe.Subscription;
      const stripeCustomerId = typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer?.id || null;
      const subscriptionId = subscription.id;

      logStep("Processing customer.subscription.created", {
        subscriptionId,
        customerId: stripeCustomerId,
        status: subscription.status,
      });

      if (stripeCustomerId && (subscription.status === 'active' || subscription.status === 'trialing')) {
        const userId = await resolveUserFromCustomer(stripe, supabase, stripeCustomerId);
        if (userId) {
          const { data: existing } = await supabase
            .from('user_entitlements')
            .select('pro_type')
            .eq('user_id', userId)
            .maybeSingle();

          if (existing?.pro_type !== 'lifetime') {
            await grantEntitlement(supabase, {
              userId,
              proType: 'subscription',
              stripeCustomerId,
              checkoutSessionId: subscriptionId,
              subscriptionId,
            });
            logStep("Subscription entitlement granted via subscription.created", { userId });
          }
        }
      }

      await supabase.from('purchase_event_log').insert({
        stripe_event_id: event.id,
        stripe_customer_id: stripeCustomerId,
        payment_status: subscription.status,
        processed: true,
        event_type: event.type,
      });
    }

    // Handle customer.subscription.updated — update status on plan changes
    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription;
      const stripeCustomerId = typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer?.id || null;

      logStep("Processing customer.subscription.updated", {
        subscriptionId: subscription.id,
        customerId: stripeCustomerId,
        status: subscription.status,
      });

      if (stripeCustomerId) {
        const { data: entitlement } = await supabase
          .from('user_entitlements')
          .select('pro_type, is_pro')
          .eq('stripe_customer_id', stripeCustomerId)
          .maybeSingle();

        // Don't touch lifetime entitlements
        if (entitlement && entitlement.pro_type !== 'lifetime') {
          if (subscription.status === 'active' || subscription.status === 'trialing') {
            if (!entitlement.is_pro) {
              await supabase
                .from('user_entitlements')
                .update({
                  is_pro: true,
                  stripe_subscription_id: subscription.id,
                  updated_at: new Date().toISOString(),
                })
                .eq('stripe_customer_id', stripeCustomerId);
              logStep("Subscription reactivated via subscription.updated", { stripeCustomerId });
            }
          } else if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
            // Keep access for now — will be revoked on subscription.deleted
            logStep("Subscription past_due/unpaid, keeping access for now", { stripeCustomerId });
          }
        }
      }

      await supabase.from('purchase_event_log').insert({
        stripe_event_id: event.id,
        stripe_customer_id: stripeCustomerId,
        payment_status: subscription.status,
        processed: true,
        event_type: event.type,
      });
    }

    // Mark event as processed (idempotency)
    await supabase.from('stripe_processed_events').insert({ event_id: event.id });

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function grantEntitlement(
  supabase: ReturnType<typeof createClient>,
  params: {
    userId: string;
    proType: string;
    stripeCustomerId: string | null;
    checkoutSessionId: string;
    subscriptionId?: string | null;
  }
) {
  const { userId, proType, stripeCustomerId, checkoutSessionId, subscriptionId } = params;
  const now = new Date().toISOString();

  // Upsert: if entitlement exists, update; otherwise insert
  const { error } = await supabase
    .from('user_entitlements')
    .upsert({
      user_id: userId,
      is_pro: true,
      pro_type: proType,
      pro_activated_at: now,
      stripe_customer_id: stripeCustomerId,
      stripe_checkout_session_id: checkoutSessionId,
      stripe_subscription_id: subscriptionId || null,
      updated_at: now,
    }, { onConflict: 'user_id' });

  if (error) {
    logStep("Failed to grant entitlement", { error: error.message, userId });
    throw error;
  }
}

async function recordOrphanPayment(
  supabase: ReturnType<typeof createClient>,
  params: {
    sessionId: string;
    customerId: string | null;
    email: string | null;
    amount: number | null;
    currency: string | null;
  }
) {
  await supabase.from('orphan_payments').insert({
    stripe_session_id: params.sessionId,
    stripe_customer_id: params.customerId,
    email: params.email,
    amount: params.amount,
    currency: params.currency,
  });
}

// Resolve a Supabase user ID from a Stripe customer ID
async function resolveUserFromCustomer(
  stripe: Stripe,
  supabase: ReturnType<typeof createClient>,
  stripeCustomerId: string
): Promise<string | null> {
  // 1. Check user_entitlements table first (fastest)
  const { data: entitlement } = await supabase
    .from('user_entitlements')
    .select('user_id')
    .eq('stripe_customer_id', stripeCustomerId)
    .maybeSingle();

  if (entitlement?.user_id) return entitlement.user_id;

  // 2. Check Stripe customer metadata
  try {
    const customer = await stripe.customers.retrieve(stripeCustomerId);
    if (!customer.deleted) {
      if (customer.metadata?.supabase_user_id) {
        return customer.metadata.supabase_user_id;
      }
      // 3. Fall back to email lookup
      if (customer.email) {
        const { data: userData } = await supabase.auth.admin.listUsers();
        const matched = userData?.users?.find(
          (u: { email?: string }) => u.email?.toLowerCase() === customer.email!.toLowerCase()
        );
        if (matched) return matched.id;
      }
    }
  } catch (e) {
    logStep("resolveUserFromCustomer failed", { error: String(e) });
  }

  return null;
}
