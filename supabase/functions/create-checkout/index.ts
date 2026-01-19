import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Price IDs for different currencies (with 30-day trial)
const PRICE_IDS = {
  USD: "price_1SqlanGiNcIsULtkonowz5Fd", // $2.99/month USD
  CAD: "price_1Sr1nPGiNcIsULtkfvqszh5A", // $3.99/month CAD
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Use service role for profile updates
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  // Use anon key for auth
  const supabaseAuth = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    // Parse request body for currency
    let currency = "USD";
    try {
      const body = await req.json();
      if (body.currency && (body.currency === "CAD" || body.currency === "USD")) {
        currency = body.currency;
      }
    } catch {
      // No body or invalid JSON, use default USD
    }
    logStep("Currency determined", { currency });

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseAuth.auth.getUser(token);
    const user = data.user;
    
    if (!user?.email) {
      throw new Error("User not authenticated or email not available");
    }
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2025-08-27.basil" 
    });

    // Check if customer already exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
    } else {
      logStep("No existing customer found, will create new");
    }

    // Check for existing active/trialing subscription to prevent duplicates
    if (customerId) {
      const activeSubscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 1,
      });
      
      if (activeSubscriptions.data.length > 0) {
        logStep("User already has active subscription", { 
          subscriptionId: activeSubscriptions.data[0].id 
        });
        throw new Error("You already have an active subscription. Please manage it from your profile settings.");
      }
      
      const trialingSubscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "trialing",
        limit: 1,
      });
      
      if (trialingSubscriptions.data.length > 0) {
        logStep("User already has trialing subscription", { 
          subscriptionId: trialingSubscriptions.data[0].id 
        });
        throw new Error("You already have an active trial. Please manage it from your profile settings.");
      }
    }

    // Check trial eligibility
    let hasHadSubscription = false;
    let hasUsedTrialLocally = false;

    // Check Stripe subscription history (any past subscription means they've had access)
    if (customerId) {
      const allSubscriptions = await stripe.subscriptions.list({
        customer: customerId,
        limit: 1,
      });
      hasHadSubscription = allSubscriptions.data.length > 0;
      logStep("Checked Stripe subscription history", { hasHadSubscription });
    }

    // Check local flag in profiles table
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('has_used_trial')
      .eq('user_id', user.id)
      .single();

    hasUsedTrialLocally = profile?.has_used_trial === true;
    logStep("Checked local trial flag", { hasUsedTrialLocally });

    // Only offer trial if they've never had a subscription AND haven't used trial locally
    const shouldOfferTrial = !hasHadSubscription && !hasUsedTrialLocally;
    logStep("Trial eligibility determined", { shouldOfferTrial, hasHadSubscription, hasUsedTrialLocally });

    // Select price based on currency
    const priceId = PRICE_IDS[currency as keyof typeof PRICE_IDS] || PRICE_IDS.USD;
    logStep("Selected price", { priceId, currency });

    // Create checkout session for Noteshare Premium subscription
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      subscription_data: shouldOfferTrial 
        ? { trial_period_days: 30 }
        : {},
      success_url: `${req.headers.get("origin")}/profile?subscription=success`,
      cancel_url: `${req.headers.get("origin")}/profile?subscription=cancelled`,
      payment_method_types: ["card"],
      allow_promotion_codes: true,
    });

    logStep("Checkout session created", { 
      sessionId: session.id, 
      trialOffered: shouldOfferTrial,
      trialDays: shouldOfferTrial ? 30 : 0 
    });

    // Mark that this user has used their trial eligibility (if we're offering one)
    if (shouldOfferTrial) {
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({ has_used_trial: true })
        .eq('user_id', user.id);
      
      if (updateError) {
        logStep("Warning: Failed to update has_used_trial flag", { error: updateError.message });
      } else {
        logStep("Marked user as having used trial");
      }
    }

    return new Response(JSON.stringify({ url: session.url }), {
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
