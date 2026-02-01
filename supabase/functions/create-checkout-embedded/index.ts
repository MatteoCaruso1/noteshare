import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Price ID for $2.49 CAD/month subscription
const SUBSCRIPTION_PRICE_ID = "price_1Sw8ilGiNcIsULtkGOJKoXdT";

// Trial period in days
const TRIAL_DAYS = 7;

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT-EMBEDDED] ${step}${detailsStr}`);
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
      // Create a new customer
      const newCustomer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id }
      });
      customerId = newCustomer.id;
      logStep("Created new customer", { customerId });
    }

    // Check trial eligibility with 5-minute grace period for accidental cancels
    const GRACE_PERIOD_MS = 5 * 60 * 1000; // 5 minutes
    let shouldOfferTrial = true;
    let graceReason = "new_user";

    // Check Stripe subscription history
    const allSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 10, // Get more to check history properly
    });
    logStep("Fetched subscription history", { count: allSubscriptions.data.length });

    if (allSubscriptions.data.length > 0) {
      // Check if any subscription was ever active (converted from trial to paid)
      const hasActiveHistory = allSubscriptions.data.some(
        (sub: { status: string }) => sub.status === 'active' || sub.status === 'past_due'
      );

      if (hasActiveHistory) {
        // They've had a paid subscription - no trial
        shouldOfferTrial = false;
        graceReason = "had_active_subscription";
        logStep("User had active subscription, no trial", { hasActiveHistory });
      } else {
        // All subscriptions were trialing or canceled trialing - check for grace period
        const canceledTrials = allSubscriptions.data.filter(
          (sub: { status: string; trial_end: number | null }) => sub.status === 'canceled' && sub.trial_end !== null
        );

        if (canceledTrials.length > 0) {
          // Check if the most recent canceled trial is within 5-minute grace period
          const mostRecentTrial = canceledTrials[0] as { 
            id: string; 
            created: number; 
            canceled_at: number | null;
          };
          const createdAt = mostRecentTrial.created * 1000; // Convert to ms
          const canceledAt = mostRecentTrial.canceled_at
            ? mostRecentTrial.canceled_at * 1000
            : Date.now();

          const durationMs = canceledAt - createdAt;
          const wasQuickCancel = durationMs < GRACE_PERIOD_MS;

          if (wasQuickCancel) {
            // Grace period applies - allow trial
            shouldOfferTrial = true;
            graceReason = "grace_period_eligible";
            logStep("Grace period eligible - quick cancel", {
              subscriptionId: mostRecentTrial.id,
              createdAt: new Date(createdAt).toISOString(),
              canceledAt: new Date(canceledAt).toISOString(),
              durationMinutes: Math.round(durationMs / 60000)
            });
          } else {
            // Canceled after 5 minutes - no re-trial
            shouldOfferTrial = false;
            graceReason = "canceled_after_grace_period";
            logStep("No trial - canceled after grace period", {
              subscriptionId: mostRecentTrial.id,
              durationMinutes: Math.round(durationMs / 60000)
            });
          }
        } else {
          // Has subscriptions but none are canceled trials with trial_end
          // Check if there's a currently trialing subscription
          const currentlyTrialing = allSubscriptions.data.some(
            (sub: { status: string }) => sub.status === 'trialing'
          );
          if (currentlyTrialing) {
            shouldOfferTrial = false;
            graceReason = "already_trialing";
            logStep("Already has active trial");
          } else {
            // Edge case: subscriptions exist but aren't active/trialing/canceled-trial
            shouldOfferTrial = false;
            graceReason = "has_subscription_history";
            logStep("Has subscription history, no trial");
          }
        }
      }
    }

    // Also check local flag (for users who never completed Stripe checkout)
    // BUT allow grace period to override the local flag
    if (shouldOfferTrial && graceReason !== "grace_period_eligible") {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('has_used_trial')
        .eq('user_id', user.id)
        .single();

      if (profile?.has_used_trial === true) {
        shouldOfferTrial = false;
        graceReason = "local_flag_set";
        logStep("Local trial flag is set, no trial");
      }
    }

    logStep("Trial eligibility determined", { shouldOfferTrial, graceReason });

    const origin = req.headers.get("origin") || "https://noteshare.app";

    // Create checkout session with ui_mode: 'embedded' for embedded checkout
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: SUBSCRIPTION_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: "subscription",
      ui_mode: "embedded",
      subscription_data: shouldOfferTrial 
        ? { trial_period_days: TRIAL_DAYS }
        : {},
      return_url: `${origin}/profile?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
      payment_method_types: ["card"],
    });

    logStep("Checkout session created", { 
      sessionId: session.id, 
      trialOffered: shouldOfferTrial,
      trialDays: shouldOfferTrial ? TRIAL_DAYS : 0,
      hasClientSecret: !!session.client_secret 
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

    // Return the client secret for embedded checkout
    return new Response(JSON.stringify({ 
      clientSecret: session.client_secret,
      sessionId: session.id,
      trialEndDate: shouldOfferTrial 
        ? new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString()
        : null,
      trialOffered: shouldOfferTrial,
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
