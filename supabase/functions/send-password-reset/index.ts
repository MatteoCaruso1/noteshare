import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetRequest {
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: PasswordResetRequest = await req.json();

    // Validate email
    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create admin client to generate recovery link
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get the site URL from the request origin or use a default
    const origin = req.headers.get('origin') || 'https://notesharemusic.com';
    const redirectTo = `${origin}/auth`;

    console.log('[SEND-PASSWORD-RESET] Generating recovery link for:', email);

    // Generate the recovery link using Supabase Admin API
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: redirectTo
      }
    });

    if (linkError) {
      console.error('[SEND-PASSWORD-RESET] Error generating link:', linkError.message);
      // Don't reveal if user exists or not for security
      // Return success anyway to prevent email enumeration
      return new Response(
        JSON.stringify({ success: true, message: "If an account exists, a reset email has been sent" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // The generated link contains the token - we need to use it
    const resetUrl = linkData.properties?.action_link;

    if (!resetUrl) {
      console.error('[SEND-PASSWORD-RESET] No action link generated');
      return new Response(
        JSON.stringify({ error: "Failed to generate reset link" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log('[SEND-PASSWORD-RESET] Sending email via Resend');

    // Send the email with mobile-friendly HTML using Resend API directly
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Noteshare <noreply@notesharemusic.com>",
        to: [email],
        subject: "Reset your Noteshare password",
        html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #1a1a1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #1a1a1a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #262626; border-radius: 16px; overflow: hidden;">
          <!-- Header with Logo -->
          <tr>
            <td align="center" style="padding: 40px 30px 20px 30px;">
              <div style="width: 56px; height: 56px; background: linear-gradient(135deg, #E8A828, #d4972a); border-radius: 50%; display: inline-block; text-align: center; line-height: 56px;">
                <span style="font-size: 28px;">🎵</span>
              </div>
              <h1 style="color: #ffffff; font-size: 24px; font-weight: 600; margin: 16px 0 8px 0;">Noteshare</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <h2 style="color: #ffffff; font-size: 20px; font-weight: 600; margin: 0 0 16px 0; text-align: center;">Reset Your Password</h2>
              <p style="color: #a3a3a3; font-size: 16px; line-height: 24px; margin: 0 0 24px 0; text-align: center;">
                We received a request to reset your password. Tap the button below to choose a new one.
              </p>
              
              <!-- Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 8px 0 24px 0;">
                    <a href="${resetUrl}" 
                       target="_blank"
                       style="display: inline-block; 
                              background-color: #E8A828; 
                              color: #000000; 
                              padding: 16px 40px; 
                              text-decoration: none; 
                              border-radius: 8px; 
                              font-weight: 600; 
                              font-size: 16px;
                              text-align: center;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Alternative Link -->
              <p style="color: #737373; font-size: 14px; line-height: 20px; margin: 0 0 16px 0; text-align: center;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="color: #E8A828; font-size: 12px; line-height: 18px; margin: 0 0 24px 0; text-align: center; word-break: break-all;">
                <a href="${resetUrl}" style="color: #E8A828; text-decoration: underline;">${resetUrl}</a>
              </p>
              
              <!-- Security Note -->
              <div style="background-color: #1a1a1a; border-radius: 8px; padding: 16px; margin-top: 16px;">
                <p style="color: #a3a3a3; font-size: 14px; line-height: 20px; margin: 0; text-align: center;">
                  🔒 This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; border-top: 1px solid #404040;">
              <p style="color: #737373; font-size: 12px; line-height: 18px; margin: 0; text-align: center;">
                Noteshare - Helping musicians practice smarter
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `,
      }),
    });

    const emailResult = await emailResponse.json();
    
    if (!emailResponse.ok) {
      console.error("[SEND-PASSWORD-RESET] Resend error:", emailResult);
      throw new Error(emailResult.message || 'Failed to send email');
    }

    console.log("[SEND-PASSWORD-RESET] Email sent successfully:", emailResult);

    return new Response(
      JSON.stringify({ success: true, message: "Password reset email sent" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("[SEND-PASSWORD-RESET] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
