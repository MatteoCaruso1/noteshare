import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FeedbackPayload {
  userName: string;
  userEmail: string;
  likeMost: string;
  dislikeMost?: string;
  willingToPay?: string;
  npsScore?: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: FeedbackPayload = await req.json();
    const { userName, userEmail, likeMost, dislikeMost, willingToPay, npsScore } = payload;

    // Build email content
    const emailBody = `
New Feedback from Noteshare

From: ${userName} (${userEmail})
Submitted: ${new Date().toLocaleString()}

---

1. What do you like most about Noteshare?
${likeMost}

2. What do you dislike or find confusing?
${dislikeMost || "No response"}

3. What features would you be willing to pay for?
${willingToPay || "No response"}

4. NPS Score (1-10): ${npsScore || "Not provided"}

---
End of feedback
    `.trim();

    // Send email using Resend API
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (!resendApiKey) {
      console.log("RESEND_API_KEY not configured - logging feedback instead:");
      console.log(emailBody);
      return new Response(
        JSON.stringify({ success: true, message: "Feedback logged (email not configured)" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Noteshare Feedback <onboarding@resend.dev>",
        to: ["matteo.m.caruso1@gmail.com"],
        subject: `Noteshare Feedback from ${userName}`,
        text: emailBody,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("Failed to send email:", errorText);
      // Still return success since feedback is stored in DB
      return new Response(
        JSON.stringify({ success: true, message: "Feedback saved (email delivery pending)" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Feedback sent successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing feedback:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process feedback" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});