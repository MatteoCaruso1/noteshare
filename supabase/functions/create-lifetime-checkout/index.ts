import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Lifetime access price IDs ($9.99)
const LIFETIME_PRICES = {
  CAD: "price_1Sw8hBGiNcIsULtkxrZRuf6O",
  USD: "price_1SwEHaGiNcIsULtkrQuVwm7M",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-LIFETIME-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Use anon key for auth
  const supabaseAuth = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    // Parse currency from request body
    const body = await req.json().catch(() => ({}));
    const currency = body.currency === 'CAD' ? 'CAD' : 'USD';
    const lifetimePriceId = LIFETIME_PRICES[currency as keyof typeof LIFETIME_PRICES];
    logStep("Using currency", { currency, priceId: lifetimePriceId });

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
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
      // Backfill metadata if missing
      if (!customers.data[0].metadata?.supabase_user_id) {
        await stripe.customers.update(customerId, {
          metadata: { supabase_user_id: user.id },
        }).catch(() => {});
      }
      
      // Check if user already has lifetime access by looking for completed payments
      const paymentIntents = await stripe.paymentIntents.list({
        customer: customerId,
        limit: 100,
      });
      
      // Check if any successful payment was for the lifetime product
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
                (item: Stripe.LineItem) => 
                  item.price?.id === LIFETIME_PRICES.CAD || item.price?.id === LIFETIME_PRICES.USD
              );
              
              if (hasLifetimePrice) {
                logStep("User already has lifetime access");
                throw new Error("You already have lifetime access to Premium.");
              }
            }
          }
        }
      }
    } else {
      // Create customer with metadata
      const newCustomer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = newCustomer.id;
      logStep("Created new customer with metadata", { customerId });
    }

    // Guard: refuse to create session without a valid customer ID
    if (!customerId) {
      throw new Error("Failed to find or create Stripe customer. Cannot proceed with checkout.");
    }

    const origin = req.headers.get("origin") || "https://noteshare.app";

    // Create one-time payment session for lifetime access with embedded UI
    // Include user_id in metadata for deterministic user mapping
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: lifetimePriceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      ui_mode: "embedded",
      return_url: `${origin}/profile?lifetime=success&session_id={CHECKOUT_SESSION_ID}`,
      payment_method_types: ["card"],
      allow_promotion_codes: true,
      metadata: {
        user_id: user.id,
        email: user.email,
      },
    });

    logStep("Lifetime checkout session created", { 
      sessionId: session.id, 
      hasClientSecret: !!session.client_secret 
    });

    // Return the client secret for embedded checkout
    return new Response(JSON.stringify({ 
      clientSecret: session.client_secret,
      sessionId: session.id,
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
