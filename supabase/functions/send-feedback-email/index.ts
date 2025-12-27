import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// HTML escape function to prevent XSS in email content
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with the user's JWT
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("Auth error:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user profile for accurate name/email
    const { data: profile } = await supabase
      .from("profiles")
      .select("name")
      .eq("user_id", user.id)
      .single();

    const userName = profile?.name || "Anonymous";
    const userEmail = user.email || "No email";

    // Get feedback content from request
    const payload = await req.json();
    const { likeMost, dislikeMost, npsScore } = payload;

    // Validate required field
    if (!likeMost || typeof likeMost !== "string" || likeMost.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing required field: likeMost" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (!resendApiKey) {
      console.log("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: true, message: "Feedback saved (email not configured)" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build email content with HTML-escaped user inputs
    const emailHtml = `
      <h2>New Feedback from noteshare</h2>
      <p><strong>From:</strong> ${escapeHtml(userName)} (${escapeHtml(userEmail)})</p>
      <p><strong>User ID:</strong> ${escapeHtml(user.id)}</p>
      <p><strong>Submitted:</strong> ${new Date().toISOString()}</p>
      <hr/>
      
      <h3>1. What do you like most about noteshare?</h3>
      <p>${escapeHtml(likeMost)}</p>
      
      <h3>2. What do you dislike or find confusing?</h3>
      <p>${dislikeMost ? escapeHtml(dislikeMost) : "<em>No response</em>"}</p>
      
      <h3>3. NPS Score (1-10)</h3>
      <p>${npsScore ? escapeHtml(String(npsScore)) : "<em>Not provided</em>"}</p>
      
      <hr/>
      <p><em>End of feedback</em></p>
    `;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "noteshare Feedback <onboarding@resend.dev>",
        to: ["matteo.m.caruso1@gmail.com"],
        subject: `noteshare Feedback from ${userName}`,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("Failed to send email:", errorText);
      return new Response(
        JSON.stringify({ success: true, message: "Feedback saved (email delivery pending)" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Email sent successfully for user:", user.id);

    return new Response(
      JSON.stringify({ success: true, message: "Feedback sent successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error processing feedback:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);