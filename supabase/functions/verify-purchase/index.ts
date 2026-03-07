import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LIFETIME_PRICE_IDS = [
  "price_1Sw8hBGiNcIsULtkxrZRuf6O",
  "price_1SwEHaGiNcIsULtkrQuVwm7M",
  "price_1Sv63tGiNcIsULtk4t3RRrAK",
];

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-PURCHASE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const supabaseAuth = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    logStep("User authenticated", { userId: user.id });

    const body = await req.json().catch(() => ({}));
    const sessionId = body.session_id;

    if (!sessionId) {
      return new Response(JSON.stringify({ error: "session_id required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Check if entitlement already exists
    const { data: existing } = await supabase
      .from('user_entitlements')
      .select('is_pro, pro_type')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing?.is_pro) {
      logStep("Entitlement already granted", { userId: user.id, proType: existing.pro_type });
      return new Response(JSON.stringify({
        verified: true,
        already_entitled: true,
        pro_type: existing.pro_type,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Fetch session from Stripe to verify payment
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items'],
    });

    logStep("Stripe session fetched", {
      sessionId: session.id,
      paymentStatus: session.payment_status,
      mode: session.mode,
    });

    if (session.payment_status !== 'paid' && session.mode === 'payment') {
      return new Response(JSON.stringify({ verified: false, reason: "Payment not completed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // For subscriptions, check status
    if (session.mode === 'subscription' && session.status !== 'complete') {
      return new Response(JSON.stringify({ verified: false, reason: "Session not complete" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Verify this session belongs to this user via metadata
    const sessionUserId = session.metadata?.user_id;
    if (sessionUserId && sessionUserId !== user.id) {
      logStep("User ID mismatch", { sessionUserId, currentUserId: user.id });
      return new Response(JSON.stringify({ verified: false, reason: "Session does not belong to this user" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    // Determine pro type
    let proType = 'subscription';
    if (session.mode === 'payment') {
      const hasLifetimePrice = session.line_items?.data?.some(
        (item: Stripe.LineItem) => LIFETIME_PRICE_IDS.includes(item.price?.id ?? '')
      );
      if (hasLifetimePrice) {
        proType = 'lifetime';
      }
    }

    const stripeCustomerId = typeof session.customer === 'string' ? session.customer : null;
    const subscriptionId = typeof session.subscription === 'string' ? session.subscription : null;

    // Grant entitlement
    const now = new Date().toISOString();
    await supabase.from('user_entitlements').upsert({
      user_id: user.id,
      is_pro: true,
      pro_type: proType,
      pro_activated_at: now,
      stripe_customer_id: stripeCustomerId,
      stripe_checkout_session_id: sessionId,
      stripe_subscription_id: subscriptionId,
      updated_at: now,
    }, { onConflict: 'user_id' });

    // Log the verification
    await supabase.from('purchase_event_log').insert({
      stripe_customer_id: stripeCustomerId,
      user_id: user.id,
      checkout_session_id: sessionId,
      payment_status: session.payment_status,
      processed: true,
      event_type: 'verify_purchase',
    });

    logStep("Entitlement granted via verification", { userId: user.id, proType });

    return new Response(JSON.stringify({
      verified: true,
      already_entitled: false,
      pro_type: proType,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
