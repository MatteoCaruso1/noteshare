import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Lifetime access price IDs (current + legacy)
const LIFETIME_PRICE_IDS = [
  "price_1THkZ8GiNcIsULtkEhfGUmek", // CAD $14.99 lifetime
  "price_1Sw8hBGiNcIsULtkxrZRuf6O", // Old CAD $9.99 lifetime
  "price_1SwEHaGiNcIsULtkrQuVwm7M", // Old USD $9.99 lifetime
  "price_1Sv63tGiNcIsULtk4t3RRrAK", // Old $19.99 CAD lifetime
];
const LIFETIME_PRODUCT_IDS = [
  "prod_UGH76Futsy9n9k", // CAD $14.99 product
  "prod_TtwaOYfMnVypk4", // Old CAD $9.99 product
  "prod_Tu2MnCtrEfyciQ", // Old USD $9.99 product
  "prod_TsrnqaaViDJAas", // Old $19.99 product
];

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      logStep("No valid authorization header");
      return new Response(JSON.stringify({ 
        subscribed: false,
        product_id: null,
        subscription_end: null,
        is_lifetime: false
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    
    // Validate the JWT token and get user info
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      logStep("Token validation failed, treating as unauthenticated", { error: userError?.message });
      return new Response(JSON.stringify({ 
        subscribed: false,
        product_id: null,
        subscription_end: null,
        is_lifetime: false
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    
    const userId = user.id;
    const email = user.email;
    
    if (!userId || !email) {
      logStep("Missing user ID or email");
      return new Response(JSON.stringify({ 
        subscribed: false,
        product_id: null,
        subscription_end: null,
        is_lifetime: false
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    
    logStep("User authenticated", { userId, email });

    // --- Phase 1: Check local DB entitlement (fastest path) ---
    const { data: entitlement, error: entitlementError } = await supabaseClient
      .from('user_entitlements')
      .select('is_pro, pro_type, provider, stripe_customer_id, stripe_subscription_id, expires_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (!entitlementError && entitlement?.is_pro) {
      logStep("Local entitlement found", { proType: entitlement.pro_type, provider: entitlement.provider });
      
      // For lifetime, return immediately - no need to check provider
      if (entitlement.pro_type === 'lifetime') {
        return new Response(JSON.stringify({
          subscribed: true,
          product_id: 'prod_TtwaOYfMnVypk4', // Lifetime product ID
          subscription_end: null,
          is_lifetime: true,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // For Apple subscriptions, check expiry from the entitlement table
      if (entitlement.provider === 'apple') {
        const isExpired = entitlement.expires_at && new Date(entitlement.expires_at) < new Date();
        if (!isExpired) {
          return new Response(JSON.stringify({
            subscribed: true,
            product_id: 'apple_subscription',
            subscription_end: entitlement.expires_at,
            is_lifetime: false,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
        // Apple subscription expired — fall through to "not subscribed" unless Stripe also active
        logStep("Apple subscription expired, checking Stripe fallback");
      }

      // For Stripe subscriptions, we still verify with Stripe but use entitlement as fast-path indicator
      // This avoids the expensive orphan session scan
    }

    // --- Phase 2: Check premium override ---
    logStep("Checking premium override", { userId });
    const { data: override, error: overrideError } = await supabaseClient
      .from('premium_overrides')
      .select('enabled')
      .eq('user_id', userId)
      .maybeSingle();

    logStep("Premium override result", { override, error: overrideError?.message });

    if (!overrideError && override?.enabled === true) {
      logStep("Developer premium override active", { userId });
      return new Response(JSON.stringify({ 
        subscribed: true,
        product_id: 'prod_ToONzcZjkyqsAJ',
        subscription_end: null,
        is_lifetime: false
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    // Try email-based lookup first
    let customers = await stripe.customers.list({ email: email, limit: 1 });
    
    // Fallback: search by supabase_user_id in metadata if email lookup fails
    if (customers.data.length === 0) {
      logStep("No customer found by email, trying metadata search", { userId });
      try {
        const searchResult = await stripe.customers.search({
          query: `metadata["supabase_user_id"]:"${userId}"`,
          limit: 1,
        });
        if (searchResult.data.length > 0) {
          customers = searchResult as Stripe.ApiList<Stripe.Customer>;
          logStep("Found customer via metadata fallback", { customerId: searchResult.data[0].id });
        }
      } catch (searchErr) {
        logStep("Metadata search failed, continuing", { error: String(searchErr) });
      }
    }
    
    if (customers.data.length === 0) {
      logStep("No customer found, checking for orphan lifetime checkout sessions by email");
      // Fallback: search checkout sessions by customer_details.email for orphan payments
      try {
        const orphanSessions = await stripe.checkout.sessions.list({
          limit: 100,
        });
        
        for (const session of orphanSessions.data) {
          if (
            session.mode === 'payment' &&
            session.payment_status === 'paid' &&
            session.customer_details?.email?.toLowerCase() === email.toLowerCase()
          ) {
            const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
              expand: ['line_items'],
            });
            const hasLifetimePrice = fullSession.line_items?.data?.some(
              (item: Stripe.LineItem) => LIFETIME_PRICE_IDS.includes(item.price?.id ?? '')
            );
            if (hasLifetimePrice) {
              logStep("Found orphan lifetime payment via email fallback", { sessionId: session.id });
              return new Response(JSON.stringify({
                subscribed: true,
                product_id: LIFETIME_PRODUCT_IDS[0],
                subscription_end: null,
                is_lifetime: true
              }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
              });
            }
          }
        }
      } catch (orphanErr) {
        logStep("Orphan session search failed", { error: String(orphanErr) });
      }

      logStep("No customer or orphan payment found, user is not subscribed");
      return new Response(JSON.stringify({ 
        subscribed: false,
        product_id: null,
        subscription_end: null,
        is_lifetime: false
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customer = customers.data[0];
    const customerId = customer.id;
    
    // Backfill metadata if missing
    if (!customer.metadata?.supabase_user_id) {
      logStep("Backfilling supabase_user_id metadata on customer", { customerId });
      await stripe.customers.update(customerId, {
        metadata: { supabase_user_id: userId },
      }).catch((e: Error) => logStep("Metadata backfill failed", { error: e.message }));
    }
    logStep("Found Stripe customer", { customerId });

    // Check for lifetime purchase first
    const paymentIntents = await stripe.paymentIntents.list({
      customer: customerId,
      limit: 100,
    });
    
    for (const pi of paymentIntents.data) {
      if (pi.status === 'succeeded') {
        // Check if this payment was for the lifetime price
        const sessions = await stripe.checkout.sessions.list({
          payment_intent: pi.id,
          limit: 1,
        });
        
        if (sessions.data.length > 0) {
          const session = sessions.data[0];
          if (session.mode === 'payment') {
            // Expand line items to check for lifetime price
            const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
              expand: ['line_items'],
            });
            
            const hasLifetimePrice = fullSession.line_items?.data?.some(
              (item: Stripe.LineItem) => LIFETIME_PRICE_IDS.includes(item.price?.id ?? '')
            );
            
            if (hasLifetimePrice) {
              logStep("User has lifetime access");
              return new Response(JSON.stringify({
                subscribed: true,
                product_id: LIFETIME_PRODUCT_IDS[0], // Use the primary lifetime product ID
                subscription_end: null,
                is_lifetime: true
              }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
              });
            }
          }
        }
      }
    }

    // Fallback: if customer exists but no lifetime payment found on customer,
    // search checkout sessions by email for orphan payments
    logStep("No lifetime on customer, checking orphan sessions by email");
    try {
      const orphanSessions = await stripe.checkout.sessions.list({
        limit: 100,
      });
      
      for (const session of orphanSessions.data) {
        if (
          session.mode === 'payment' &&
          session.payment_status === 'paid' &&
          session.customer_details?.email?.toLowerCase() === email.toLowerCase() &&
          (!session.customer || session.customer !== customerId)
        ) {
          const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
            expand: ['line_items'],
          });
          const hasLifetimePrice = fullSession.line_items?.data?.some(
            (item: Stripe.LineItem) => LIFETIME_PRICE_IDS.includes(item.price?.id ?? '')
          );
          if (hasLifetimePrice) {
            logStep("Found orphan lifetime payment via email fallback (customer exists)", { sessionId: session.id });
            return new Response(JSON.stringify({
              subscribed: true,
              product_id: LIFETIME_PRODUCT_IDS[0],
              subscription_end: null,
              is_lifetime: true
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200,
            });
          }
        }
      }
    } catch (orphanErr) {
      logStep("Orphan session search failed (customer exists path)", { error: String(orphanErr) });
    }

    // Check for active subscriptions first
    let subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    
    // If no active subscription, check for trialing subscriptions
    if (subscriptions.data.length === 0) {
      logStep("No active subscription, checking for trialing");
      subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "trialing",
        limit: 1,
      });
    }
    
    // If still no subscription, check for canceled subscriptions that are still within their paid period
    // (user canceled but hasn't reached end of billing period yet)
    if (subscriptions.data.length === 0) {
      logStep("No trialing subscription, checking for canceled with remaining access");
      const canceledSubs = await stripe.subscriptions.list({
        customer: customerId,
        status: "canceled",
        limit: 10,
      });
      
      // Find any canceled subscription where current_period_end is still in the future
      const now = Math.floor(Date.now() / 1000);
      const stillValidSub = canceledSubs.data.find((sub: Stripe.Subscription) => {
        const periodEnd = sub.current_period_end;
        return periodEnd && typeof periodEnd === 'number' && periodEnd > now;
      });
      
      if (stillValidSub) {
        logStep("Found canceled subscription with remaining access period", {
          subscriptionId: stillValidSub.id,
          periodEnd: new Date(stillValidSub.current_period_end * 1000).toISOString()
        });
        subscriptions = { data: [stillValidSub] } as Stripe.ApiList<Stripe.Subscription>;
      }
    }
    
    const hasActiveSub = subscriptions.data.length > 0;
    let productId = null;
    let subscriptionEnd = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      const periodEnd = subscription.current_period_end;
      
      // Safely handle date conversion with defensive check
      if (periodEnd && typeof periodEnd === 'number') {
        subscriptionEnd = new Date(periodEnd * 1000).toISOString();
      } else {
        logStep("Warning: current_period_end is invalid", { periodEnd });
      }
      
      productId = subscription.items.data[0]?.price?.product ?? null;
      logStep("Subscription found", { 
        subscriptionId: subscription.id, 
        status: subscription.status,
        productId,
        endDate: subscriptionEnd 
      });
    } else {
      logStep("No active, trialing, or valid canceled subscription found");
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      product_id: productId,
      subscription_end: subscriptionEnd,
      is_lifetime: false
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
