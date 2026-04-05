import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // Find users with streak >= 3 who haven't practiced today
    // and haven't already received a streak_warning today
    const { data: atRiskUsers, error } = await supabase.rpc("get_streak_warning_users");

    if (error) {
      // Fallback: use direct query if RPC doesn't exist yet
      const { data: profiles, error: profileErr } = await supabase
        .from("profiles")
        .select("id, name, current_streak, timezone")
        .gte("current_streak", 3);

      if (profileErr) throw profileErr;
      if (!profiles?.length) {
        return new Response(JSON.stringify({ processed: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Filter to users where it's 8 PM+ in their local timezone
      const now = new Date();
      const eligibleByTime = profiles.filter((p) => {
        const tz = p.timezone || "America/New_York";
        try {
          const localHour = parseInt(
            new Intl.DateTimeFormat("en-US", {
              timeZone: tz,
              hour: "numeric",
              hour12: false,
            }).format(now)
          );
          return localHour >= 20; // 8 PM+
        } catch {
          // Invalid timezone, fall back to ET
          const etHour = parseInt(
            new Intl.DateTimeFormat("en-US", {
              timeZone: "America/New_York",
              hour: "numeric",
              hour12: false,
            }).format(now)
          );
          return etHour >= 20;
        }
      });

      if (eligibleByTime.length === 0) {
        console.log(`Skipping: no users in 8PM+ window (checked ${profiles.length} profiles)`);
        return new Response(JSON.stringify({ processed: 0, skipped: "no_users_in_window" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const userIds = eligibleByTime.map((p) => p.id);

      // Get today's date in each user's timezone — use UTC date as approximation for batch query
      const todayUTC = new Date().toISOString().split("T")[0];

      // Check who practiced today
      const { data: todaySessions } = await supabase
        .from("practice_sessions")
        .select("user_id")
        .in("user_id", userIds)
        .gte("started_at", `${todayUTC}T00:00:00Z`);

      const practicedToday = new Set(todaySessions?.map((s) => s.user_id) || []);

      // Check who already got a streak_warning today
      const { data: existingWarnings } = await supabase
        .from("notifications")
        .select("user_id")
        .in("user_id", userIds)
        .eq("type", "streak_warning")
        .gte("created_at", `${todayUTC}T00:00:00Z`);

      const alreadyWarned = new Set(existingWarnings?.map((n) => n.user_id) || []);

      // Filter to eligible users
      const eligible = eligibleByTime.filter(
        (p) => !practicedToday.has(p.id) && !alreadyWarned.has(p.id)
      );

      if (eligible.length === 0) {
        return new Response(JSON.stringify({ processed: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Insert streak warning notifications
      const notifications = eligible.map((p) => ({
        user_id: p.id,
        type: "streak_warning",
        content: `You're on a ${p.current_streak}-day streak, log a session to keep it alive!`,
      }));

      const { error: insertErr } = await supabase
        .from("notifications")
        .insert(notifications);

      if (insertErr) throw insertErr;

      console.log(`Sent ${eligible.length} streak warnings`);

      return new Response(
        JSON.stringify({ processed: eligible.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ processed: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Streak warning error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
