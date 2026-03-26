import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation helpers
const isValidEmail = (email: unknown): email is string => {
  if (typeof email !== 'string' || email.length > 254) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidName = (name: unknown): name is string => {
  if (typeof name !== 'string') return false;
  // Allow empty string but limit length
  return name.length <= 100;
};

const isValidToken = (token: unknown): token is string => {
  if (typeof token !== 'string') return false;
  // UUID format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(token);
};

// HTML escape function to prevent XSS
const escapeHtml = (str: string): string => {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return str.replace(/[&<>"']/g, (char) => htmlEscapes[char] || char);
};

interface TeamInvitationRequest {
  inviteeEmail: string;
  inviteeFirstName: string;
  inviteeLastName: string;
  inviterName: string;
  invitationToken: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    const { 
      inviteeEmail, 
      inviteeFirstName, 
      inviteeLastName,
      inviterName,
      invitationToken 
    } = body as TeamInvitationRequest;

    // Validate all inputs
    if (!isValidEmail(inviteeEmail)) {
      throw new Error("Invalid invitee email format");
    }

    if (!isValidName(inviteeFirstName)) {
      throw new Error("Invalid first name: must be a string with max 100 characters");
    }

    if (!isValidName(inviteeLastName)) {
      throw new Error("Invalid last name: must be a string with max 100 characters");
    }

    if (!isValidName(inviterName) || inviterName.trim().length === 0) {
      throw new Error("Invalid inviter name: must be a non-empty string with max 100 characters");
    }

    if (!isValidToken(invitationToken)) {
      throw new Error("Invalid invitation token format");
    }

    console.log("Sending team invitation email to:", inviteeEmail);

    // Escape all user-provided content for HTML
    const safeDisplayName = escapeHtml(inviteeFirstName || inviteeEmail.split('@')[0]);
    const safeInviterName = escapeHtml(inviterName);
    const acceptUrl = `https://app.clozze.io/auth?invitation=${encodeURIComponent(invitationToken)}`;

    const emailResponse = await resend.emails.send({
      from: "Clozze <hello@mail.clozze.io>",
      replyTo: "contact@clozze.io",
      to: [inviteeEmail],
      subject: `${safeInviterName} invited you to join their team on Clozze`,
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
              .highlight { background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>You're Invited!</h1>
              </div>
              <div class="content">
                <p>Hi ${safeDisplayName},</p>
                <p><strong>${safeInviterName}</strong> has invited you to join their team on Clozze - the all-in-one real estate management platform!</p>
                <div class="highlight">
                  <p style="margin: 0;">As a team member, you'll be able to:</p>
                </div>
                <ul>
                  <li>Collaborate on listings and buyer management</li>
                  <li>Access shared tasks and workflows</li>
                  <li>Communicate with team members</li>
                  <li>Track your performance metrics</li>
                </ul>
                <p style="text-align: center;">
                  <a href="${acceptUrl}" class="button">Accept Invitation</a>
                </p>
                <p style="font-size: 14px; color: #6b7280;">This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.</p>
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

    console.log("Team invitation email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending team invitation email:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
