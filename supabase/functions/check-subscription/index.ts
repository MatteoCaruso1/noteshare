import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Lifetime access price IDs (both old and new) and product IDs
const LIFETIME_PRICE_IDS = [
  "price_1Sw8hBGiNcIsULtkxrZRuf6O", // New $9.99 CAD lifetime
  "price_1Sv63tGiNcIsULtk4t3RRrAK", // Old $19.99 CAD lifetime (for existing customers)
];
const LIFETIME_PRODUCT_IDS = [
  "prod_TtwaOYfMnVypk4", // New $9.99 product
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

    // Check for developer premium override in dedicated table (no RLS - backend only)
    logStep("Checking premium override", { userId });
    const { data: override, error: overrideError } = await supabaseClient
      .from('premium_overrides')
      .select('enabled')
      .eq('user_id', userId)
      .maybeSingle();

    logStep("Premium override result", { override, error: overrideError?.message });

    if (!overrideError && override?.enabled === true) {
      logStep("Developer premium override active", { userId });
      // Return the REAL premium product_id so frontend isPremium logic works
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
    const customers = await stripe.customers.list({ email: email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found, user is not subscribed");
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

    const customerId = customers.data[0].id;
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
