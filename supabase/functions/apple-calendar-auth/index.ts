import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface RequestBody {
  action: "connect" | "disconnect" | "verify";
  apple_id?: string;
  app_specific_password?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
    const { action, apple_id, app_specific_password } = await req.json() as RequestBody;

    if (action === "connect") {
      if (!apple_id || !app_specific_password) {
        return new Response(
          JSON.stringify({ error: "Apple ID and App-Specific Password are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify credentials by attempting CalDAV connection
      // Apple Calendar uses CalDAV at caldav.icloud.com
      const caldavUrl = "https://caldav.icloud.com";
      
      try {
        const verifyResponse = await fetch(`${caldavUrl}/`, {
          method: "PROPFIND",
          headers: {
            "Authorization": `Basic ${btoa(`${apple_id}:${app_specific_password}`)}`,
            "Depth": "0",
            "Content-Type": "application/xml",
          },
          body: `<?xml version="1.0" encoding="utf-8"?>
            <D:propfind xmlns:D="DAV:">
              <D:prop>
                <D:current-user-principal/>
              </D:prop>
            </D:propfind>`,
        });

        if (verifyResponse.status === 401) {
          return new Response(
            JSON.stringify({ error: "Invalid Apple ID or App-Specific Password" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!verifyResponse.ok && verifyResponse.status !== 207) {
          console.error("CalDAV verification failed:", verifyResponse.status);
          return new Response(
            JSON.stringify({ error: "Failed to verify Apple Calendar credentials" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (caldavError) {
        console.error("CalDAV connection error:", caldavError);
        // Continue anyway - some network configurations may block CalDAV but it may still work
      }

      // Store connection securely using vault via RPC function
      const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      const { data: connectionId, error: rpcError } = await adminClient.rpc('store_calendar_tokens', {
        _user_id: userId,
        _provider: 'apple',
        _provider_email: apple_id,
        _provider_account_id: null,
        _access_token: app_specific_password,
        _refresh_token: null,
        _expires_at: null,
      });

      if (rpcError) {
        console.error("Database error:", rpcError);
        return new Response(
          JSON.stringify({ error: "Failed to save connection securely" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          email: apple_id,
          message: "Apple Calendar connected successfully" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "disconnect") {
      const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Get the vault_secret_id before deleting the connection
      const { data: connection } = await adminClient
        .from("calendar_connections")
        .select("vault_secret_id")
        .eq("user_id", userId)
        .eq("provider", "apple")
        .single();

      // Delete the connection
      const { error } = await adminClient
        .from("calendar_connections")
        .delete()
        .eq("user_id", userId)
        .eq("provider", "apple");

      if (error) {
        return new Response(
          JSON.stringify({ error: "Failed to disconnect" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Clean up vault secret if it exists
      if (connection?.vault_secret_id) {
        await adminClient
          .from("vault.secrets")
          .delete()
          .eq("id", connection.vault_secret_id);
      }

      return new Response(
        JSON.stringify({ success: true, message: "Apple Calendar disconnected" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in apple-calendar-auth:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});