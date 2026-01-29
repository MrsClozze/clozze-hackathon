import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CALENDAR_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CALENDAR_CLIENT_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface RequestBody {
  action: "get_auth_url" | "exchange_code" | "disconnect";
  code?: string;
  redirect_uri?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate credentials exist
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return new Response(
        JSON.stringify({ 
          error: "Google Calendar credentials not configured",
          setup_required: true 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    const { action, code, redirect_uri } = await req.json() as RequestBody;

    if (action === "get_auth_url") {
      const scopes = [
        "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/calendar.events",
        "https://www.googleapis.com/auth/userinfo.email",
      ];

      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: redirect_uri || `${req.headers.get("origin")}/integrations`,
        response_type: "code",
        scope: scopes.join(" "),
        access_type: "offline",
        prompt: "consent",
        state: userId,
      });

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

      return new Response(
        JSON.stringify({ auth_url: authUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "exchange_code") {
      if (!code || !redirect_uri) {
        return new Response(
          JSON.stringify({ error: "Missing code or redirect_uri" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Exchange code for tokens
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          code,
          grant_type: "authorization_code",
          redirect_uri,
        }),
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        console.error("Token exchange error:", tokenData);
        return new Response(
          JSON.stringify({ error: tokenData.error_description || "Token exchange failed" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get user info to get email
      const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const userInfo = await userInfoResponse.json();

      // Store connection in database using service role
      const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

      const { error: upsertError } = await adminClient
        .from("calendar_connections")
        .upsert({
          user_id: userId,
          provider: "google",
          provider_account_id: userInfo.id,
          provider_email: userInfo.email,
          access_token_encrypted: tokenData.access_token, // In production, encrypt this
          refresh_token_encrypted: tokenData.refresh_token,
          token_expires_at: expiresAt.toISOString(),
          sync_enabled: true,
        }, { onConflict: "user_id,provider" });

      if (upsertError) {
        console.error("Database error:", upsertError);
        return new Response(
          JSON.stringify({ error: "Failed to save connection" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          email: userInfo.email,
          message: "Google Calendar connected successfully" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "disconnect") {
      const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      const { error } = await adminClient
        .from("calendar_connections")
        .delete()
        .eq("user_id", userId)
        .eq("provider", "google");

      if (error) {
        return new Response(
          JSON.stringify({ error: "Failed to disconnect" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "Google Calendar disconnected" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in google-calendar-auth:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
