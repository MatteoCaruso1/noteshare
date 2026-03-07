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
          .select('pro_type')
          .eq('stripe_customer_id', stripeCustomerId)
          .maybeSingle();

        if (entitlement && entitlement.pro_type !== 'lifetime') {
          await supabase
            .from('user_entitlements')
            .update({ is_pro: false, updated_at: new Date().toISOString() })
            .eq('stripe_customer_id', stripeCustomerId);
          logStep("Subscription entitlement revoked", { stripeCustomerId });
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
