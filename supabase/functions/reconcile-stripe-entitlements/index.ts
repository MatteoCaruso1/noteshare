import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Known price IDs
const LIFETIME_PRICE_IDS = [
  "price_1Sw8hBGiNcIsULtkxrZRuf6O",
  "price_1SwEHaGiNcIsULtkrQuVwm7M",
  "price_1Sv63tGiNcIsULtk4t3RRrAK",
];

const SUBSCRIPTION_PRICE_IDS = [
  "price_1SwECHGiNcIsULtk8vfidptO",
  "price_1SwEHEGiNcIsULtkXsU7dXl7",
];

const ALL_KNOWN_PRICE_IDS = [...LIFETIME_PRICE_IDS, ...SUBSCRIPTION_PRICE_IDS];

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[RECONCILE] ${step}${detailsStr}`);
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

  const stats = { sessionsChecked: 0, invoicesChecked: 0, corrected: 0, errors: 0 };
  const now = Math.floor(Date.now() / 1000);
  const twentyFourHoursAgo = now - 86400;

  try {
    logStep("Reconciliation started");

    // --- Phase 1: Reconcile checkout sessions (lifetime + initial subscription) ---
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const params: Stripe.Checkout.SessionListParams = {
        limit: 50,
        created: { gte: twentyFourHoursAgo },
        status: 'complete',
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      };

      const sessions = await stripe.checkout.sessions.list(params);

      for (const session of sessions.data) {
        stats.sessionsChecked++;

        // Only trust metadata.user_id — never email
        const userId = session.metadata?.user_id;
        if (!userId) continue;
        if (session.payment_status !== 'paid') continue;

        const stripeCustomerId = typeof session.customer === 'string'
          ? session.customer : session.customer?.id || null;

        if (session.mode === 'payment') {
          // Check line items for lifetime price
          const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
            expand: ['line_items'],
          });
          const hasLifetimePrice = fullSession.line_items?.data?.some(
            (item: Stripe.LineItem) => LIFETIME_PRICE_IDS.includes(item.price?.id ?? '')
          );

          if (hasLifetimePrice) {
            const corrected = await ensureEntitlement(supabase, {
              userId,
              proType: 'lifetime',
              stripeCustomerId,
              checkoutSessionId: session.id,
            });
            if (corrected) {
              stats.corrected++;
              logStep("Corrected missing lifetime entitlement", { userId, sessionId: session.id });
            }
          }
        } else if (session.mode === 'subscription') {
          const subscriptionId = typeof session.subscription === 'string'
            ? session.subscription : session.subscription?.id || null;

          // Verify the subscription is actually active before granting
          if (subscriptionId) {
            try {
              const sub = await stripe.subscriptions.retrieve(subscriptionId);
              if (sub.status === 'active' || sub.status === 'trialing') {
                const corrected = await ensureEntitlement(supabase, {
                  userId,
                  proType: 'subscription',
                  stripeCustomerId,
                  checkoutSessionId: session.id,
                  subscriptionId,
                });
                if (corrected) {
                  stats.corrected++;
                  logStep("Corrected missing subscription entitlement", { userId, sessionId: session.id });
                }
              }
            } catch (e) {
              logStep("Subscription retrieve failed during reconciliation", { error: String(e), subscriptionId });
              stats.errors++;
            }
          }
        }
      }

      hasMore = sessions.has_more;
      if (sessions.data.length > 0) {
        startingAfter = sessions.data[sessions.data.length - 1].id;
      } else {
        hasMore = false;
      }
    }

    // --- Phase 2: Reconcile paid invoices (subscription renewals) ---
    hasMore = true;
    startingAfter = undefined;

    while (hasMore) {
      const params: Stripe.InvoiceListParams = {
        limit: 50,
        created: { gte: twentyFourHoursAgo },
        status: 'paid',
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      };

      const invoices = await stripe.invoices.list(params);

      for (const invoice of invoices.data) {
        stats.invoicesChecked++;

        const subscriptionId = typeof invoice.subscription === 'string'
          ? invoice.subscription : invoice.subscription?.id || null;
        if (!subscriptionId) continue;

        const stripeCustomerId = typeof invoice.customer === 'string'
          ? invoice.customer : invoice.customer?.id || null;
        if (!stripeCustomerId) continue;

        // Look up user_id from existing entitlement (we only trust metadata or DB, not email)
        const { data: entitlement } = await supabase
          .from('user_entitlements')
          .select('user_id, is_pro, pro_type')
          .eq('stripe_customer_id', stripeCustomerId)
          .maybeSingle();

        if (!entitlement) continue; // No known user for this customer — skip (can't trust email)
        if (entitlement.pro_type === 'lifetime') continue; // Never downgrade lifetime
        if (entitlement.is_pro) continue; // Already active — nothing to fix

        // Verify subscription is still active
        try {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          if (sub.status === 'active' || sub.status === 'trialing') {
            await supabase
              .from('user_entitlements')
              .update({
                is_pro: true,
                stripe_subscription_id: subscriptionId,
                updated_at: new Date().toISOString(),
              })
              .eq('user_id', entitlement.user_id);

            stats.corrected++;
            logStep("Corrected subscription via invoice reconciliation", {
              userId: entitlement.user_id,
              invoiceId: invoice.id,
            });

            await supabase.from('purchase_event_log').insert({
              stripe_event_id: `reconcile_invoice_${invoice.id}`,
              stripe_customer_id: stripeCustomerId,
              user_id: entitlement.user_id,
              checkout_session_id: invoice.id,
              payment_status: 'paid',
              processed: true,
              event_type: 'reconciliation',
              error_message: 'Auto-corrected by reconciliation job',
            });
          }
        } catch (e) {
          logStep("Subscription verify failed during invoice reconciliation", { error: String(e) });
          stats.errors++;
        }
      }

      hasMore = invoices.has_more;
      if (invoices.data.length > 0) {
        startingAfter = invoices.data[invoices.data.length - 1].id;
      } else {
        hasMore = false;
      }
    }

    logStep("Reconciliation complete", stats);

    return new Response(JSON.stringify({ success: true, ...stats }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("FATAL ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage, stats }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

/**
 * Ensures a user has the correct entitlement. Returns true if a correction was made.
 * Never downgrades — only upgrades or fills missing entitlements.
 */
async function ensureEntitlement(
  supabase: ReturnType<typeof createClient>,
  params: {
    userId: string;
    proType: string;
    stripeCustomerId: string | null;
    checkoutSessionId: string;
    subscriptionId?: string | null;
  }
): Promise<boolean> {
  const { userId, proType, stripeCustomerId, checkoutSessionId, subscriptionId } = params;

  // Check current state
  const { data: existing } = await supabase
    .from('user_entitlements')
    .select('is_pro, pro_type')
    .eq('user_id', userId)
    .maybeSingle();

  // Never downgrade lifetime to subscription
  if (existing?.pro_type === 'lifetime' && proType === 'subscription') return false;
  // Already correct
  if (existing?.is_pro && existing?.pro_type === proType) return false;

  const now = new Date().toISOString();

  await supabase
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

  // Log the correction
  await supabase.from('purchase_event_log').insert({
    stripe_event_id: `reconcile_${checkoutSessionId}`,
    stripe_customer_id: stripeCustomerId,
    user_id: userId,
    checkout_session_id: checkoutSessionId,
    payment_status: 'paid',
    processed: true,
    event_type: 'reconciliation',
    error_message: 'Auto-corrected by reconciliation job',
  });

  return true;
}
