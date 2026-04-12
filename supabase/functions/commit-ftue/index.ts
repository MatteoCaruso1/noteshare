import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Validate the JWT token using service role client to avoid session-dependency issues
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } =
      await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      console.error("Auth validation failed:", userError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // Parse body
    const body = await req.json();
    const {
      name,
      instrument,
      instruments,
      idempotencyKey,
      completedPhases,
    } = body as {
      name: string;
      instrument: string;
      instruments?: string[];
      practiceNotes?: string;
      tags?: string[];
      focusLevel?: number | null;
      durationMinutes?: number;
      idempotencyKey: string;
      completedPhases?: number[];
    };

    // Validate
    if (!name || !instrument || !idempotencyKey) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Idempotency: check if we already committed for this user+key
    const { data: existing } = await serviceClient
      .from("onboarding_step_events")
      .select("id")
      .eq("user_id", userId)
      .eq("step_number", 111)
      .maybeSingle();

    if (existing) {
      // Already committed — return success without duplicating
      return new Response(
        JSON.stringify({ success: true, deduplicated: true }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 1. Update profile with name + instrument + mark onboarding complete
    const profileInstruments = instruments && instruments.length > 0 ? instruments : [instrument];
    const { error: profileError } = await serviceClient
      .from("profiles")
      .update({
        name: name.trim().slice(0, 50),
        instruments: profileInstruments,
        has_completed_onboarding: true,
      })
      .eq("user_id", userId);

    if (profileError) {
      console.error("Profile update error:", profileError);
      return new Response(
        JSON.stringify({ error: "Failed to update profile" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2. Record FTUE funnel steps for analytics (fire-and-forget)
    if (completedPhases && completedPhases.length > 0) {
      const stepRows = completedPhases.map((phase: number) => ({
        user_id: userId,
        step_number: 100 + phase,
      }));
      const { error: stepsError } = await serviceClient
        .from("onboarding_step_events")
        .upsert(stepRows, { onConflict: "user_id,step_number" });
      if (stepsError) {
        console.error("FTUE step tracking error:", stepsError);
      }
    }

    // Record that this user completed the full FTUE flow
    await serviceClient
      .from("onboarding_step_events")
      .upsert([
        { user_id: userId, step_number: 110 },
        { user_id: userId, step_number: 111 },
      ], { onConflict: "user_id,step_number" })
      .then(({ error: e }) => { if (e) console.error("FTUE completion tracking error:", e); });

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("commit-ftue error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
