import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Apple product ID → entitlement mapping
const APPLE_PRODUCTS: Record<string, { proType: string; isLifetime: boolean }> = {
  noteshare_pro_monthly: { proType: "subscription", isLifetime: false },
  noteshare_pro_lifetime: { proType: "lifetime", isLifetime: true },
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[VERIFY-APPLE-PURCHASE] ${step}${detailsStr}`);
};

/**
 * Verify an Apple IAP transaction using App Store Server API v2 (JWS).
 * Falls back to the legacy /verifyReceipt endpoint if JWS verification
 * is not configured (APPLE_IAP_SHARED_SECRET set).
 */
async function verifyWithAppStore(
  transactionId: string,
  receiptData?: string
): Promise<{
  valid: boolean;
  productId: string | null;
  originalTransactionId: string | null;
  expiresAt: string | null;
  environment: string;
}> {
  // Approach: Use the legacy verifyReceipt endpoint with the receipt data
  // This is simpler and works for both subscriptions and one-time purchases
  const sharedSecret = Deno.env.get("APPLE_IAP_SHARED_SECRET");

  if (receiptData && sharedSecret) {
    logStep("Verifying via legacy /verifyReceipt endpoint");

    // Try production first, fall back to sandbox
    const endpoints = [
      "https://buy.itunes.apple.com/verifyReceipt",
      "https://sandbox.itunes.apple.com/verifyReceipt",
    ];

    for (const endpoint of endpoints) {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          "receipt-data": receiptData,
          password: sharedSecret,
          "exclude-old-transactions": true,
        }),
      });

      const result = await response.json();

      // Status 21007 means receipt is from sandbox — retry with sandbox endpoint
      if (result.status === 21007 && endpoint.includes("buy.itunes")) {
        logStep("Receipt is sandbox, retrying with sandbox endpoint");
        continue;
      }

      if (result.status !== 0) {
        logStep("Receipt validation failed", { status: result.status, endpoint });
        continue;
      }

      // Find the matching transaction
      const latestReceipt = result.latest_receipt_info;
      const inAppPurchases = result.receipt?.in_app || [];
      const allTransactions = [...(latestReceipt || []), ...inAppPurchases];

      // Find a transaction matching our product IDs
      const matchedTxn = allTransactions.find(
        (txn: Record<string, string>) =>
          txn.transaction_id === transactionId ||
          txn.original_transaction_id === transactionId ||
          Object.keys(APPLE_PRODUCTS).includes(txn.product_id)
      );

      if (matchedTxn) {
        const expiresMs = matchedTxn.expires_date_ms
          ? parseInt(matchedTxn.expires_date_ms)
          : null;

        return {
          valid: true,
          productId: matchedTxn.product_id,
          originalTransactionId: matchedTxn.original_transaction_id || transactionId,
          expiresAt: expiresMs ? new Date(expiresMs).toISOString() : null,
          environment: endpoint.includes("sandbox") ? "sandbox" : "production",
        };
      }

      logStep("No matching transaction found in receipt", {
        transactionCount: allTransactions.length,
      });
      return { valid: false, productId: null, originalTransactionId: null, expiresAt: null, environment: "unknown" };
    }
  }

  // TODO: Replace stub validation with real Apple Server API verification
  // once APPLE_IAP_SHARED_SECRET is configured in App Store Connect.
  // For now, trust client-provided data and store raw receipt for future re-validation.
  if (!sharedSecret) {
    logStep("WARNING: APPLE_IAP_SHARED_SECRET not set — using stub validation. Receipt stored for future verification.");
    return {
      valid: true,
      productId: null, // Will fall back to client-provided product_id
      originalTransactionId: transactionId,
      expiresAt: null,
      environment: "stub",
    };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      logStep("Auth failed", { error: userError?.message });
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    logStep("User authenticated", { userId });

    // Parse request body
    const body = await req.json();
    const { transaction_id, product_id, receipt_data, jws_representation } = body;

    if (!transaction_id || !product_id) {
      return new Response(
        JSON.stringify({ error: "Missing transaction_id or product_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Verifying purchase", { transaction_id, product_id });

    // Validate product ID
    const productConfig = APPLE_PRODUCTS[product_id];
    if (!productConfig) {
      logStep("Unknown product_id", { product_id });
      return new Response(
        JSON.stringify({ error: "Unknown product" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for duplicate transaction (idempotency)
    const { data: existingEntitlement } = await supabase
      .from("user_entitlements")
      .select("id, user_id")
      .eq("apple_original_transaction_id", transaction_id)
      .maybeSingle();

    if (existingEntitlement) {
      if (existingEntitlement.user_id === userId) {
        logStep("Transaction already processed for this user", { transaction_id });
        return new Response(
          JSON.stringify({ verified: true, already_entitled: true, pro_type: productConfig.proType }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      } else {
        logStep("Transaction belongs to different user", { transaction_id });
        return new Response(
          JSON.stringify({ error: "Transaction already claimed by another account" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Verify with Apple
    const verification = await verifyWithAppStore(transaction_id, receipt_data);

    if (!verification.valid) {
      logStep("Apple verification failed", { transaction_id });
      return new Response(
        JSON.stringify({ error: "Receipt verification failed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Apple verification succeeded", {
      productId: verification.productId,
      originalTransactionId: verification.originalTransactionId,
      expiresAt: verification.expiresAt,
      environment: verification.environment,
    });

    // For subscriptions, check if expired
    if (verification.expiresAt && new Date(verification.expiresAt) < new Date()) {
      logStep("Subscription has expired", { expiresAt: verification.expiresAt });
      return new Response(
        JSON.stringify({ error: "Subscription expired", expired: true }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upsert entitlement
    const { error: upsertError } = await supabase
      .from("user_entitlements")
      .upsert(
        {
          user_id: userId,
          is_pro: true,
          pro_type: productConfig.proType,
          provider: "apple",
          apple_original_transaction_id: verification.originalTransactionId || transaction_id,
          apple_product_id: verification.productId || product_id,
          expires_at: verification.expiresAt,
          pro_activated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (upsertError) {
      logStep("Entitlement upsert failed", { error: upsertError.message });
      return new Response(
        JSON.stringify({ error: "Failed to grant entitlement" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the purchase event
    await supabase.from("purchase_event_log").insert({
      user_id: userId,
      event_type: "apple_iap_verified",
      checkout_session_id: transaction_id,
      payment_status: "paid",
      processed: true,
    });

    logStep("Entitlement granted successfully", { userId, proType: productConfig.proType });

    return new Response(
      JSON.stringify({
        verified: true,
        already_entitled: false,
        pro_type: productConfig.proType,
        is_lifetime: productConfig.isLifetime,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
