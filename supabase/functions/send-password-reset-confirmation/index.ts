import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetConfirmationRequest {
  email: string;
  firstName?: string;
  redirectOrigin?: string;
}

const escapeHtml = (str: string): string => {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return str.replace(/[&<>"']/g, (ch) => htmlEscapes[ch]);
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, firstName, redirectOrigin }: PasswordResetConfirmationRequest = await req.json();
    
    const displayName = escapeHtml(firstName || email.split('@')[0]);
    const baseOrigin = (redirectOrigin && !redirectOrigin.includes('lovableproject.com'))
      ? redirectOrigin
      : 'https://clozze.lovable.app';

    const loginLink = `${baseOrigin}/auth`;

    const emailResponse = await resend.emails.send({
      from: "Clozze <hello@mail.clozze.io>",
      replyTo: "contact@clozze.io",
      to: [email],
      subject: "Password Reset Confirmed - Clozze",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #ffffff; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none; }
              .button { display: inline-block; background: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
              .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
              .success-box { background: #d1fae5; border-left: 4px solid #10b981; padding: 12px; margin: 20px 0; border-radius: 4px; }
              .security-notice { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; border-radius: 4px; font-size: 14px; }
              h1 { margin: 0; font-size: 28px; }
              p { margin: 16px 0; }
              .icon { font-size: 48px; margin-bottom: 10px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="icon">✓</div>
                <h1>Password Reset Confirmed</h1>
              </div>
              <div class="content">
                <p>Hi ${displayName},</p>
                <div class="success-box">
                  <strong>✓ Your password has been successfully reset and confirmed!</strong>
                </div>
                <p>You can now sign in to your Clozze account using your new password.</p>
                <p style="text-align: center;">
                  <a href="${escapeHtml(loginLink)}" class="button">Sign In to Clozze</a>
                </p>
                <div class="security-notice">
                  <strong>🔐 Security Reminder</strong><br>
                  Keep your password secure and never share it with anyone. If you didn't reset your password or suspect unauthorized access to your account, please contact our support team immediately at hello@mail.clozze.io
                </div>
                <p>Best regards,<br>The Clozze Team</p>
              </div>
              <div class="footer">
                <p>© 2025 Clozze. All rights reserved.</p>
                <p>Need help? Contact us at hello@mail.clozze.io</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Password reset confirmation email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending password reset confirmation email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
