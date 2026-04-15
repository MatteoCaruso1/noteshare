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

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth
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

    // Check daily limit (shared with routine generations)
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

    const { instrument, level, genre, practiceType } = await req.json();

    if (!instrument && !level && !genre && !practiceType) {
      return new Response(JSON.stringify({ error: "Please provide at least one input field" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build search query for YouTube music tutorials
    const parts = [instrument, level, genre, practiceType].filter(Boolean);
    const searchQuery = `site:youtube.com ${parts.join(" ")} music tutorial lesson practice`;

    // Use Firecrawl search to find relevant YouTube videos
    const firecrawlResponse = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 8,
      }),
    });

    if (!firecrawlResponse.ok) {
      const errText = await firecrawlResponse.text();
      console.error("Firecrawl error:", firecrawlResponse.status, errText);
      if (firecrawlResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Search credits exhausted. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Failed to search for training content" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const searchData = await firecrawlResponse.json();
    const results = searchData.data || [];

    // Filter to YouTube video URLs only
    const youtubeResults = results.filter((r: any) => {
      const url = r.url || "";
      return url.includes("youtube.com/watch") || url.includes("youtu.be/");
    });

    if (youtubeResults.length === 0) {
      return new Response(JSON.stringify({
        error: "No relevant YouTube videos found. Try different search terms.",
        remaining: DAILY_LIMIT - usedToday,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use Gemini to pick the best 2 results
    const candidateList = youtubeResults.slice(0, 8).map((r: any, i: number) => (
      `${i + 1}. Title: ${r.title || "Unknown"}\n   URL: ${r.url}\n   Description: ${(r.description || "").slice(0, 200)}`
    )).join("\n\n");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are a music education expert. Given a list of YouTube video search results and a musician's profile, pick the 2 most relevant and helpful videos for their practice needs. Return ONLY a JSON array of exactly 2 objects with "title", "url", and "reason" (a brief 1-sentence explanation of why this video is helpful). No markdown, no code blocks, just the JSON array.`,
          },
          {
            role: "user",
            content: `Musician profile:
- Instrument: ${instrument || "not specified"}
- Level: ${level || "not specified"}
- Genre: ${genre || "not specified"}
- Practice focus: ${practiceType || "not specified"}

YouTube videos found:
${candidateList}

Pick the 2 best videos and return as JSON array.`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error:", aiResponse.status);
      // Fallback: return top 2 from Firecrawl directly
      const fallback = youtubeResults.slice(0, 2).map((r: any) => ({
        title: r.title || "YouTube Video",
        url: r.url,
        reason: r.description?.slice(0, 100) || "Relevant to your practice",
      }));

      await adminClient.from("routine_generations").insert({ user_id: profile.id });
      return new Response(JSON.stringify({
        videos: fallback,
        remaining: DAILY_LIMIT - usedToday - 1,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    let content = aiData.choices?.[0]?.message?.content || "[]";
    
    // Clean markdown code blocks if present
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    let videos: any[];
    try {
      videos = JSON.parse(content);
      if (!Array.isArray(videos)) videos = [videos];
      videos = videos.slice(0, 2);
    } catch {
      // Fallback to top 2 from search
      videos = youtubeResults.slice(0, 2).map((r: any) => ({
        title: r.title || "YouTube Video",
        url: r.url,
        reason: r.description?.slice(0, 100) || "Relevant to your practice",
      }));
    }

    // Log the generation
    await adminClient.from("routine_generations").insert({ user_id: profile.id });

    const remaining = DAILY_LIMIT - usedToday - 1;

    return new Response(JSON.stringify({ videos, remaining, limit: DAILY_LIMIT }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("find-training-content error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
