import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet: string;
  payload: {
    headers: { name: string; value: string }[];
    body?: { data?: string };
    parts?: { mimeType: string; body?: { data?: string } }[];
  };
  internalDate: string;
}

async function getAccessToken(adminClient: any, userId: string): Promise<string | null> {
  // Get the integration record with tokens stored directly
  const { data: integration, error } = await adminClient
    .from("service_integrations")
    .select("access_token_encrypted, refresh_token_encrypted, token_expires_at")
    .eq("user_id", userId)
    .eq("service_name", "gmail")
    .eq("is_connected", true)
    .single();

  if (error || !integration) {
    console.error("No Gmail integration found for user:", userId, error);
    return null;
  }

  if (!integration.access_token_encrypted) {
    console.error("Gmail integration found but no access token stored");
    return null;
  }

  // Check if token is expired and needs refresh
  if (integration.token_expires_at) {
    const expiresAt = new Date(integration.token_expires_at);
    const now = new Date();
    
    // If token expires in less than 5 minutes, try to refresh
    if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
      const clientId = Deno.env.get('GOOGLE_CALENDAR_CLIENT_ID') || Deno.env.get('GOOGLE_CLIENT_ID');
      const clientSecret = Deno.env.get('GOOGLE_CALENDAR_CLIENT_SECRET') || Deno.env.get('GOOGLE_CLIENT_SECRET');
      
      if (integration.refresh_token_encrypted && clientId && clientSecret) {
        const refreshedTokens = await refreshAccessToken(integration.refresh_token_encrypted, clientId, clientSecret);
        if (refreshedTokens) {
          // Update the stored tokens
          const newExpiresAt = new Date(Date.now() + (refreshedTokens.expires_in * 1000));
          await adminClient
            .from("service_integrations")
            .update({
              access_token_encrypted: refreshedTokens.access_token,
              token_expires_at: newExpiresAt.toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId)
            .eq("service_name", "gmail");
          
          return refreshedTokens.access_token;
        }
      }
    }
  }

  return integration.access_token_encrypted;
}

async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<{ access_token: string; expires_in: number } | null> {
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      console.error("Failed to refresh token:", await response.text());
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error refreshing token:", error);
    return null;
  }
}

async function fetchGmailMessages(accessToken: string, maxResults = 20): Promise<GmailMessage[]> {
  const messages: GmailMessage[] = [];

  // Get list of message IDs
  const listResponse = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&labelIds=INBOX`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!listResponse.ok) {
    console.error("Failed to fetch message list:", await listResponse.text());
    return [];
  }

  const listData = await listResponse.json();
  
  if (!listData.messages || listData.messages.length === 0) {
    return [];
  }

  // Fetch each message's details
  for (const msg of listData.messages) {
    try {
      const msgResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (msgResponse.ok) {
        const msgData = await msgResponse.json();
        messages.push(msgData);
      }
    } catch (err) {
      console.error(`Error fetching message ${msg.id}:`, err);
    }
  }

  return messages;
}

function parseEmailHeaders(headers: { name: string; value: string }[]): {
  from: string;
  fromName: string;
  subject: string;
} {
  let from = "";
  let fromName = "";
  let subject = "";

  for (const header of headers) {
    if (header.name.toLowerCase() === "from") {
      from = header.value;
      // Parse name from "Name <email@example.com>" format
      const match = from.match(/^(.+?)\s*<(.+)>$/);
      if (match) {
        fromName = match[1].replace(/"/g, "").trim();
        from = match[2];
      }
    }
    if (header.name.toLowerCase() === "subject") {
      subject = header.value;
    }
  }

  return { from, fromName: fromName || from, subject };
}

function getEmailBody(message: GmailMessage): string {
  // Try to get plain text body
  if (message.payload.parts) {
    for (const part of message.payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return atob(part.body.data.replace(/-/g, "+").replace(/_/g, "/"));
      }
    }
    // Fallback to HTML if no plain text
    for (const part of message.payload.parts) {
      if (part.mimeType === "text/html" && part.body?.data) {
        const html = atob(part.body.data.replace(/-/g, "+").replace(/_/g, "/"));
        // Strip HTML tags for preview
        return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      }
    }
  }

  // Single part message
  if (message.payload.body?.data) {
    return atob(message.payload.body.data.replace(/-/g, "+").replace(/_/g, "/"));
  }

  return message.snippet || "";
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized - Missing bearer token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // verify_jwt=false; we MUST pass the token explicitly
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { action, maxResults = 20 } = body;

    if (action === "sync") {
      // Get access token from vault
      const accessToken = await getAccessToken(adminClient, user.id);
      
      if (!accessToken) {
        return new Response(
          JSON.stringify({ success: false, error: "Gmail not connected or token expired" }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch emails from Gmail
      const messages = await fetchGmailMessages(accessToken, maxResults);
      
      if (messages.length === 0) {
        return new Response(
          JSON.stringify({ success: true, synced: 0, message: "No new emails to sync" }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Process and store emails
      let syncedCount = 0;
      for (const msg of messages) {
        const headers = parseEmailHeaders(msg.payload.headers);
        const bodyPreview = getEmailBody(msg).substring(0, 500);
        const receivedAt = new Date(parseInt(msg.internalDate));

        const { error: upsertError } = await adminClient
          .from("synced_emails")
          .upsert({
            user_id: user.id,
            external_email_id: msg.id,
            sender_email: headers.from,
            sender_name: headers.fromName,
            subject: headers.subject,
            snippet: msg.snippet,
            body_preview: bodyPreview,
            received_at: receivedAt.toISOString(),
            is_read: !msg.labelIds?.includes("UNREAD"),
            labels: msg.labelIds || [],
            thread_id: msg.threadId,
            ai_analyzed: false,
          }, {
            onConflict: "user_id,external_email_id",
          });

        if (!upsertError) {
          syncedCount++;
        } else {
          console.error("Error upserting email:", upsertError);
        }
      }

      return new Response(
        JSON.stringify({ success: true, synced: syncedCount }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    console.error('Gmail sync error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
