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
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Get all profiles
    const { data: allProfiles, error: profileErr } = await supabase
      .from("profiles")
      .select("id, name");

    if (profileErr) throw profileErr;
    if (!allProfiles?.length) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allIds = allProfiles.map((p) => p.id);

    // Find users who HAVE practiced in last 7 days
    const { data: activeSessions } = await supabase
      .from("practice_sessions")
      .select("user_id")
      .in("user_id", allIds)
      .gte("started_at", sevenDaysAgo);

    const activeUsers = new Set(activeSessions?.map((s) => s.user_id) || []);

    // Find users already notified for inactivity in last 7 days
    const { data: recentInactiveNotifs } = await supabase
      .from("notifications")
      .select("user_id")
      .in("user_id", allIds)
      .eq("type", "inactive")
      .gte("created_at", sevenDaysAgo);

    const alreadyNotified = new Set(recentInactiveNotifs?.map((n) => n.user_id) || []);

    // Filter: inactive + not recently notified + has at least some history
    // (only notify users who have ever had a session, to avoid spamming new users)
    const { data: everPracticed } = await supabase
      .from("practice_sessions")
      .select("user_id")
      .in("user_id", allIds)
      .limit(1000);

    const hasHistory = new Set(everPracticed?.map((s) => s.user_id) || []);

    const eligible = allProfiles.filter(
      (p) =>
        !activeUsers.has(p.id) &&
        !alreadyNotified.has(p.id) &&
        hasHistory.has(p.id)
    );

    if (eligible.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const notifications = eligible.map((p) => ({
      user_id: p.id,
      type: "inactive",
      content: "You haven't logged practice in 7 days, pick it back up today!",
    }));

    const { error: insertErr } = await supabase
      .from("notifications")
      .insert(notifications);

    if (insertErr) throw insertErr;

    console.log(`Sent ${eligible.length} inactivity notifications`);

    return new Response(
      JSON.stringify({ processed: eligible.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Inactive users error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
