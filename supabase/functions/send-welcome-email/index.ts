import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface WelcomeEmailRequest {
  email: string;
  firstName?: string;
  lastName?: string;
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
    const { email, firstName, lastName }: WelcomeEmailRequest = await req.json();
    
    const displayName = escapeHtml(
      firstName && lastName 
        ? `${firstName} ${lastName}` 
        : firstName || email.split('@')[0]
    );

    const emailResponse = await resend.emails.send({
      from: "Clozze <hello@mail.clozze.io>",
      replyTo: "contact@clozze.io",
      to: [email],
      subject: "Welcome to Clozze!",
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
              h1 { margin: 0; font-size: 28px; }
              p { margin: 16px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to Clozze!</h1>
              </div>
              <div class="content">
                <p>Hi ${displayName},</p>
                <p>Welcome to Clozze - your all-in-one real estate management platform! We're excited to have you on board.</p>
                <p>With Clozze, you can:</p>
                <ul>
                  <li>Manage your buyers and listings efficiently</li>
                  <li>Track tasks and stay organized</li>
                  <li>Communicate with clients seamlessly</li>
                  <li>Access powerful AI-assisted features</li>
                </ul>
                <p>To get started, please verify your email address by clicking the verification link in the separate email we just sent you.</p>
                <p><strong>Important:</strong> You have 3 days to verify your account. After that, you'll need to re-register.</p>
                <a href="https://clozze.lovable.app" class="button">Get Started with Clozze</a>
                <p>If you have any questions, feel free to reach out to us at contact@clozze.io</p>
                <p>Best regards,<br>The Clozze Team</p>
              </div>
              <div class="footer">
                <p>© 2025 Clozze. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Welcome email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending welcome email:", error);
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
