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
      practiceNotes,
      tags,
      focusLevel,
      durationMinutes,
      idempotencyKey,
    } = body as {
      name: string;
      instrument: string;
      instruments?: string[];
      practiceNotes: string;
      tags: string[];
      focusLevel: number | null;
      durationMinutes: number;
      idempotencyKey: string;
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
    // We'll use the notes_summary field to store the idempotency key
    const { data: existing } = await serviceClient
      .from("practice_sessions")
      .select("id")
      .eq("user_id", userId)
      .eq("notes_summary", `ftue:${idempotencyKey}`)
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

    // 2. Create practice session
    const dur = Math.max(1, Math.min(durationMinutes || 1, 1440));
    const endedAt = new Date();
    const startedAt = new Date(endedAt.getTime() - dur * 60 * 1000);

    const { data: session, error: sessionError } = await serviceClient
      .from("practice_sessions")
      .insert({
        user_id: userId,
        started_at: startedAt.toISOString(),
        ended_at: endedAt.toISOString(),
        is_active: false,
        is_mobile: false,
        notes_summary: `ftue:${idempotencyKey}`,
      })
      .select("id")
      .single();

    if (sessionError || !session) {
      console.error("Session insert error:", sessionError);
      return new Response(
        JSON.stringify({ error: "Failed to create session" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3. Create note linked to session
    const { error: noteError } = await serviceClient.from("notes").insert({
      author_id: userId,
      session_id: session.id,
      text_content: practiceNotes || null,
      tags: tags && tags.length > 0 ? tags : [],
      visibility: "private",
    });

    if (noteError) {
      console.error("Note insert error:", noteError);
      // Session was created but note failed — not ideal but not data-losing
      // The session still exists as a record of practice
    }

    return new Response(
      JSON.stringify({ success: true, sessionId: session.id }),
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
