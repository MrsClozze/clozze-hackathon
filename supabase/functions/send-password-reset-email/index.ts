import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetRequest {
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
    const { email, firstName, redirectOrigin }: PasswordResetRequest = await req.json();
    
    const displayName = escapeHtml(firstName || email.split('@')[0]);
    
    // Create Supabase admin client to generate password reset link
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Generate password reset link
    const baseOrigin = (redirectOrigin && !redirectOrigin.includes('preview--'))
      ? redirectOrigin
      : 'https://clozze.lovable.app';

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${baseOrigin}/reset-password`
      }
    });

    if (error) throw error;

    // IMPORTANT:
    // Do NOT send `action_link` directly.
    // Many email providers/security scanners prefetch links, which consumes the one-time token
    // before the user clicks it. That creates a security and UX issue ("invalid/expired").
    // Instead, deep-link to our app with token_hash and have the user explicitly click
    // a button before we verify it.
    const tokenHash = data.properties?.hashed_token || '';

    const resetLink = tokenHash
      ? `${baseOrigin}/reset-password?type=recovery&token_hash=${encodeURIComponent(tokenHash)}`
      : '';

    const emailResponse = await resend.emails.send({
      from: "Clozze <hello@mail.clozze.io>",
      replyTo: "contact@clozze.io",
      to: [email],
      subject: "Reset Your Clozze Password",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #ffffff; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none; }
              .button { display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
              .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
              .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; border-radius: 4px; }
              h1 { margin: 0; font-size: 28px; }
              p { margin: 16px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Reset Your Password</h1>
              </div>
              <div class="content">
                <p>Hi ${displayName},</p>
                <p>We received a request to reset your password for your Clozze account.</p>
                <div class="warning">
                  <strong>⚠️ Important:</strong> This password reset link will expire in 1 hour for security reasons.
                </div>
                 <p style="text-align: center;">
                   <a href="${resetLink}" class="button">Continue to Reset Password</a>
                 </p>
                 <p>If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #667eea; font-size: 14px;">${escapeHtml(resetLink)}</p>
                <p>If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>
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

    console.log("Password reset email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending password reset email:", error);
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
