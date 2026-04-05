import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationPayload {
  title: string;
  body: string;
  user_id: string;
  type: string;
}

function buildPayload(notification: {
  type: string;
  content: string;
  user_id: string;
  from_user_name?: string;
}): NotificationPayload {
  switch (notification.type) {
    case "applause":
      return {
        title: "New applause 👏",
        body: notification.from_user_name
          ? `${notification.from_user_name} gave applause to your note`
          : "Someone gave applause to your note",
        user_id: notification.user_id,
        type: notification.type,
      };
    case "streak_warning":
      return {
        title: "Don't lose your streak 🔥",
        body: notification.content,
        user_id: notification.user_id,
        type: notification.type,
      };
    case "inactive":
      return {
        title: "It's been a while 🎵",
        body: notification.content,
        user_id: notification.user_id,
        type: notification.type,
      };
    default:
      return {
        title: "Noteshare",
        body: notification.content,
        user_id: notification.user_id,
        type: notification.type,
      };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // Fetch unsent notifications (limit batch to 100)
    const { data: pending, error: fetchErr } = await supabase
      .from("notifications")
      .select(`
        id,
        user_id,
        type,
        content,
        from_user_id,
        profiles!notifications_from_user_id_fkey(name)
      `)
      .is("sent_at", null)
      .order("created_at", { ascending: true })
      .limit(100);

    if (fetchErr) throw fetchErr;
    if (!pending?.length) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get push tokens for these users
    const userIds = [...new Set(pending.map((n) => n.user_id))];
    const { data: tokens } = await supabase
      .from("push_tokens")
      .select("user_id, token, platform")
      .in("user_id", userIds);

    const tokensByUser = new Map<string, Array<{ token: string; platform: string }>>();
    (tokens || []).forEach((t) => {
      const list = tokensByUser.get(t.user_id) || [];
      list.push({ token: t.token, platform: t.platform });
      tokensByUser.set(t.user_id, list);
    });

    // Process each notification
    const processedIds: string[] = [];
    const payloads: NotificationPayload[] = [];

    for (const notif of pending) {
      const fromUserName = (notif as any).profiles?.name || null;

      const payload = buildPayload({
        type: notif.type,
        content: notif.content,
        user_id: notif.user_id,
        from_user_name: fromUserName,
      });

      const userTokens = tokensByUser.get(notif.user_id) || [];

      // Log payload (delivery will be added later with APNs)
      console.log("PUSH_PAYLOAD:", JSON.stringify({
        ...payload,
        tokens: userTokens.map((t) => t.token.substring(0, 10) + "..."),
        token_count: userTokens.length,
      }));

      payloads.push(payload);
      processedIds.push(notif.id);
    }

    // Mark all as sent
    if (processedIds.length > 0) {
      const { error: updateErr } = await supabase
        .from("notifications")
        .update({ sent_at: new Date().toISOString() })
        .in("id", processedIds);

      if (updateErr) throw updateErr;
    }

    console.log(`Processed ${processedIds.length} notifications`);

    return new Response(
      JSON.stringify({
        processed: processedIds.length,
        payloads,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Send pending error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
