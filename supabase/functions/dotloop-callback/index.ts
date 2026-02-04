import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    // Handle user denial
    if (error) {
      console.log('[dotloop-callback] User denied access:', error);
      const stateParam = url.searchParams.get('state');
      let origin = '';
      if (stateParam) {
        try {
          const stateData = JSON.parse(atob(stateParam));
          origin = stateData.origin || '';
        } catch (e) {
          // Ignore parse errors
        }
      }
      // Redirect directly to /integrations page with status param (no popup callback page)
      const redirectUrl = origin 
        ? `${origin}/integrations?dotloop=denied`
        : '/integrations?dotloop=denied';
      return new Response(null, {
        status: 302,
        headers: { 'Location': redirectUrl },
      });
    }

    if (!code || !state) {
      console.error('[dotloop-callback] Missing code or state');
      return new Response(null, {
        status: 302,
        headers: { 'Location': '/integrations?dotloop=error&message=missing_params' },
      });
    }

    // Decode state
    let stateData;
    try {
      stateData = JSON.parse(atob(state));
    } catch (e) {
      console.error('[dotloop-callback] Invalid state:', e);
      return new Response(null, {
        status: 302,
        headers: { 'Location': '/integrations?dotloop=error&message=invalid_state' },
      });
    }

    const { userId, origin } = stateData;
    if (!userId) {
      console.error('[dotloop-callback] No userId in state');
      return new Response(null, {
        status: 302,
        headers: { 'Location': '/integrations?dotloop=error&message=no_user' },
      });
    }

    const DOTLOOP_CLIENT_ID = Deno.env.get('DOTLOOP_CLIENT_ID');
    const DOTLOOP_CLIENT_SECRET = Deno.env.get('DOTLOOP_CLIENT_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');

    if (!DOTLOOP_CLIENT_ID || !DOTLOOP_CLIENT_SECRET) {
      console.error('[dotloop-callback] Missing Dotloop credentials');
      return new Response(null, {
        status: 302,
        headers: { 'Location': '/integrations/dotloop/callback?dotloop=error&message=config_error' },
      });
    }

    const redirectUri = `${SUPABASE_URL}/functions/v1/dotloop-callback`;

    // Exchange code for tokens
    const basicAuth = btoa(`${DOTLOOP_CLIENT_ID}:${DOTLOOP_CLIENT_SECRET}`);
    
    const tokenResponse = await fetch(
      `https://auth.dotloop.com/oauth/token?grant_type=authorization_code&code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(redirectUri)}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[dotloop-callback] Token exchange failed:', tokenResponse.status, errorText);
      const errorRedirect = origin 
        ? `${origin}/integrations?dotloop=error&message=token_exchange_failed`
        : '/integrations?dotloop=error&message=token_exchange_failed';
      return new Response(null, {
        status: 302,
        headers: { 'Location': errorRedirect },
      });
    }

    const tokens = await tokenResponse.json();
    console.log('[dotloop-callback] Token exchange successful for user:', userId);

    // Store tokens in database using service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Calculate token expiry (Dotloop tokens expire in ~12 hours)
    const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000)).toISOString();

    // Store in service_integrations table
    const { error: upsertError } = await supabaseAdmin
      .from('service_integrations')
      .upsert({
        user_id: userId,
        service_name: 'dotloop',
        access_token_encrypted: tokens.access_token,
        refresh_token_encrypted: tokens.refresh_token,
        token_expires_at: expiresAt,
        is_connected: true,
        connected_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,service_name',
      });

    if (upsertError) {
      console.error('[dotloop-callback] Failed to store tokens:', upsertError);
      const errorRedirect = origin 
        ? `${origin}/integrations?dotloop=error&message=storage_failed`
        : '/integrations?dotloop=error&message=storage_failed';
      return new Response(null, {
        status: 302,
        headers: { 'Location': errorRedirect },
      });
    }

    console.log('[dotloop-callback] Tokens stored successfully for user:', userId);

    // Redirect back to the app's Integrations page with success status
    // No popup needed - user returns directly to their integrations
    const baseUrl = origin || '';
    const redirectPath = '/integrations';
    const redirectUrl = baseUrl 
      ? `${baseUrl}${redirectPath}?dotloop=success`
      : `${redirectPath}?dotloop=success`;

    console.log('[dotloop-callback] Redirecting to:', redirectUrl);
    
    return new Response(null, {
      status: 302,
      headers: {
        'Location': redirectUrl,
      },
    });
  } catch (error) {
    console.error('[dotloop-callback] Error:', error);
    return new Response(null, {
      status: 302,
      headers: {
        'Location': '/integrations?dotloop=error&message=unknown_error',
      },
    });
  }
});