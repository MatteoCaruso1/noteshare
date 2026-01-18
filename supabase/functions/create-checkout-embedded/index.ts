import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Price IDs for different currencies (with 30-day trial)
const PRICE_IDS = {
  USD: "price_1Sr25PGiNcIsULtkCe7dqa1V", // $3.49/month USD
  CAD: "price_1Sr25dGiNcIsULtkcFRqzZi7", // $4.99/month CAD
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT-EMBEDDED] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
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
    const { data } = await supabaseClient.auth.getUser(token);
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
      // Create a new customer
      const newCustomer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id }
      });
      customerId = newCustomer.id;
      logStep("Created new customer", { customerId });
    }

    // Select price based on currency
    const priceId = PRICE_IDS[currency as keyof typeof PRICE_IDS] || PRICE_IDS.USD;
    logStep("Selected price", { priceId, currency });

    const origin = req.headers.get("origin") || "https://noteshare.app";

    // Create checkout session with ui_mode: 'custom' for embedded checkout
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      ui_mode: "custom",
      subscription_data: {
        trial_period_days: 30,
      },
      return_url: `${origin}/profile?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
      payment_method_types: ["card"],
    });

    logStep("Checkout session created", { 
      sessionId: session.id, 
      trialDays: 30,
      hasClientSecret: !!session.client_secret 
    });

    // Return the client secret for embedded checkout
    return new Response(JSON.stringify({ 
      clientSecret: session.client_secret,
      sessionId: session.id,
      trialEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
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
