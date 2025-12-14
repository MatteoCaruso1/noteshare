import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (!resendApiKey) {
      console.log("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: true, message: "Feedback saved (email not configured)" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: FeedbackPayload = await req.json();
    const { userName, userEmail, likeMost, dislikeMost, willingToPay, npsScore } = payload;

    // Build email content
    const emailHtml = `
      <h2>New Feedback from Noteshare</h2>
      <p><strong>From:</strong> ${userName} (${userEmail})</p>
      <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
      <hr/>
      
      <h3>1. What do you like most about Noteshare?</h3>
      <p>${likeMost}</p>
      
      <h3>2. What do you dislike or find confusing?</h3>
      <p>${dislikeMost || "<em>No response</em>"}</p>
      
      <h3>3. What features would you be willing to pay for?</h3>
      <p>${willingToPay || "<em>No response</em>"}</p>
      
      <h3>4. NPS Score (1-10)</h3>
      <p>${npsScore || "<em>Not provided</em>"}</p>
      
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
        from: "Noteshare Feedback <onboarding@resend.dev>",
        to: ["matteo.m.caruso1@gmail.com"],
        subject: `Noteshare Feedback from ${userName}`,
        html: emailHtml,
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

    console.log("Email sent successfully");

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