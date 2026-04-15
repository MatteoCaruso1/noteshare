import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DAILY_LIMIT = 4;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get user from JWT
    const authHeader = req.headers.get("authorization") || "";
    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get profile id
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: profile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check daily limit
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count } = await adminClient
      .from("routine_generations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .gte("generated_at", todayStart.toISOString());

    const usedToday = count || 0;
    if (usedToday >= DAILY_LIMIT) {
      return new Response(JSON.stringify({
        error: `Daily limit reached (${DAILY_LIMIT} per day). Try again tomorrow!`,
        remaining: 0,
        limit: DAILY_LIMIT,
      }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { instrument, level, genre, practiceType, existingRoutine, recentNotes } = await req.json();

    if (!instrument && !level && !genre && !practiceType) {
      return new Response(JSON.stringify({ error: "Please provide at least one input field" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build context section
    let context = "";
    if (existingRoutine) {
      context += `\n\nThe musician's current practice routine/focus:\n${existingRoutine.slice(0, 1000)}`;
    }
    if (recentNotes && recentNotes.length > 0) {
      const notesText = recentNotes
        .filter((n: string) => n && n.trim())
        .slice(0, 20)
        .map((n: string) => n.slice(0, 200))
        .join("\n- ");
      if (notesText) {
        context += `\n\nRecent practice notes from the musician:\n- ${notesText}`;
      }
    }

    const systemPrompt = `You are a music practice coach. Create a focused, actionable practice routine.
Use EXACTLY these 5 sections with bullet points. Keep each section to 2-4 bullets. Be specific and practical.

Format your response EXACTLY like this (use markdown bold for headers):

**Warmup**
• [specific warmup exercise]

**Technique**
• [specific technique drill]

**Repertoire**
• [specific piece/song to work on]

**Improvisation / Musical Application**
• [specific creative exercise]

**Reflection**
• [specific reflection prompt]

Personalize based on the musician's inputs and context. Be concise — each bullet should be one clear action.`;

    const userPrompt = `Create a practice routine for:
- Instrument: ${instrument || "not specified"}
- Level: ${level || "not specified"}
- Genre: ${genre || "not specified"}
- Practice preferences: ${practiceType || "not specified"}${context}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(JSON.stringify({ error: "Failed to generate routine" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const routine = data.choices?.[0]?.message?.content || "";

    // Log the generation
    await adminClient.from("routine_generations").insert({
      user_id: profile.id,
    });

    const remaining = DAILY_LIMIT - usedToday - 1;

    return new Response(JSON.stringify({ routine, remaining, limit: DAILY_LIMIT }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-routine error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
