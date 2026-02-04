import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, user_id } = body;

    // Get client credentials - use the same Google OAuth credentials as calendar
    const clientId = Deno.env.get('GOOGLE_CALENDAR_CLIENT_ID') || Deno.env.get('GOOGLE_CLIENT_ID') || Deno.env.get('DEFAULT_GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CALENDAR_CLIENT_SECRET') || Deno.env.get('GOOGLE_CLIENT_SECRET') || Deno.env.get('DEFAULT_GOOGLE_CLIENT_SECRET');

    if (action === "get_client_id") {
      return new Response(
        JSON.stringify({ client_id: clientId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For other actions, we need user authentication
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
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

      // Lovable Cloud uses verify_jwt=false; we MUST pass the token explicitly
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (!authError && user) {
        userId = user.id;
      }
    }

    // For exchange_code, we can also use the user_id from the request body as backup
    if (!userId && action === "exchange_code" && user_id) {
      userId = user_id;
    }

    if (!userId) {
      throw new Error('Unauthorized - No valid user session');
    }

    if (action === "exchange_code") {
      const { code, redirect_uri } = body;
      
      if (!code || !redirect_uri) {
        throw new Error("Missing code or redirect_uri");
      }

      if (!clientId || !clientSecret) {
        throw new Error("Google OAuth credentials not configured");
      }

      // Exchange code for tokens
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri,
          grant_type: "authorization_code",
        }),
      });

      const tokenData = await tokenResponse.json();
      
      if (tokenData.error) {
        console.error("Token exchange error:", tokenData);
        throw new Error(tokenData.error_description || tokenData.error);
      }

      // Get user info to get email
      const userInfoResponse = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        }
      );
      const userInfo = await userInfoResponse.json();

      // Store integration in database using admin client with tokens directly
      // (vault encryption not available in Cloud environment)
      const adminClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

      // Store tokens directly in service_integrations table
      const { error: upsertError } = await adminClient
        .from("service_integrations")
        .upsert({
          user_id: userId,
          service_name: "gmail",
          is_connected: true,
          connected_at: new Date().toISOString(),
          token_expires_at: expiresAt.toISOString(),
          access_token_encrypted: tokenData.access_token,
          refresh_token_encrypted: tokenData.refresh_token || null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id,service_name",
        });

      if (upsertError) {
        console.error("Error upserting integration:", upsertError);
        throw new Error(`Failed to store integration: ${upsertError.message}`);
      }

      console.log(`Gmail connected for user ${userId}, email: ${userInfo.email}`);

      console.log(`Gmail connected for user ${userId}, email: ${userInfo.email}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          email: userInfo.email 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === "disconnect") {
      const adminClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { error } = await adminClient
        .from("service_integrations")
        .delete()
        .eq("user_id", userId)
        .eq("service_name", "gmail");

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    console.error('Gmail auth error:', error);
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
