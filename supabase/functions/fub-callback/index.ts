import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
      console.log('[fub-callback] User denied access:', error);
      let origin = '';
      if (state) {
        try {
          const stateData = JSON.parse(atob(state));
          origin = stateData.origin || '';
        } catch (_e) { /* ignore */ }
      }
      const redirectUrl = origin
        ? `${origin}/integrations?fub=denied`
        : '/integrations?fub=denied';
      return new Response(null, { status: 302, headers: { 'Location': redirectUrl } });
    }

    if (!code || !state) {
      console.error('[fub-callback] Missing code or state');
      return new Response(null, {
        status: 302,
        headers: { 'Location': '/integrations?fub=error&message=missing_params' },
      });
    }

    let stateData;
    try {
      stateData = JSON.parse(atob(state));
    } catch (_e) {
      console.error('[fub-callback] Invalid state');
      return new Response(null, {
        status: 302,
        headers: { 'Location': '/integrations?fub=error&message=invalid_state' },
      });
    }

    const { userId, origin } = stateData;
    if (!userId) {
      return new Response(null, {
        status: 302,
        headers: { 'Location': '/integrations?fub=error&message=no_user' },
      });
    }

    const FUB_CLIENT_ID = Deno.env.get('FUB_CLIENT_ID');
    const FUB_CLIENT_SECRET = Deno.env.get('FUB_CLIENT_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');

    if (!FUB_CLIENT_ID || !FUB_CLIENT_SECRET) {
      console.error('[fub-callback] Missing FUB credentials');
      const errorRedirect = origin
        ? `${origin}/integrations?fub=error&message=config_error`
        : '/integrations?fub=error&message=config_error';
      return new Response(null, { status: 302, headers: { 'Location': errorRedirect } });
    }

    const redirectUri = `${SUPABASE_URL}/functions/v1/fub-callback`;

    console.log('[fub-callback] Attempting token exchange with:', {
      redirectUri,
      codeLength: code?.length,
      hasClientId: !!FUB_CLIENT_ID,
      hasClientSecret: !!FUB_CLIENT_SECRET,
      clientIdLength: FUB_CLIENT_ID?.length,
      clientSecretLength: FUB_CLIENT_SECRET?.length,
    });

    // Exchange auth_code for tokens
    const basicAuth = btoa(`${FUB_CLIENT_ID}:${FUB_CLIENT_SECRET}`);
    
    // Try without .toString() - pass URLSearchParams directly
    const body = new URLSearchParams();
    body.set('grant_type', 'authorization_code');
    body.set('code', code!);
    body.set('redirect_uri', redirectUri);

    console.log('[fub-callback] Sending token request to https://app.followupboss.com/oauth/token');
    console.log('[fub-callback] Body params:', Array.from(body.keys()));

    const tokenResponse = await fetch('https://app.followupboss.com/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    // Log full error details
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[fub-callback] Token exchange failed:', tokenResponse.status, errorText);
      console.error('[fub-callback] Response headers:', JSON.stringify(Object.fromEntries(tokenResponse.headers.entries())));
      
      // Also try the legacy GET endpoint as fallback
      console.log('[fub-callback] Trying legacy GET endpoint as fallback...');
      const legacyUrl = new URL('https://app.followupboss.com/oauth/token');
      legacyUrl.searchParams.set('grant_type', 'auth_code');
      legacyUrl.searchParams.set('code', code!);
      legacyUrl.searchParams.set('redirect_uri', redirectUri);
      
      const legacyResponse = await fetch(legacyUrl.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
        },
      });
      
      if (legacyResponse.ok) {
        const legacyTokens = await legacyResponse.json();
        console.log('[fub-callback] Legacy GET endpoint succeeded!');
        
        // Use legacy tokens
        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );
        
        const tokenData = legacyTokens.data || legacyTokens;
        const expiresAt = tokenData.expires_in
          ? new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString()
          : null;

        await supabaseAdmin
          .from('service_integrations')
          .upsert({
            user_id: userId,
            service_name: 'follow_up_boss',
            access_token_encrypted: tokenData.access_token,
            refresh_token_encrypted: tokenData.refresh_token || null,
            token_expires_at: expiresAt,
            is_connected: true,
            connected_at: new Date().toISOString(),
          }, { onConflict: 'user_id,service_name' });

        console.log('[fub-callback] Tokens stored via legacy endpoint for user:', userId);
        const successUrl = origin ? `${origin}/integrations?fub=success` : '/integrations?fub=success';
        return new Response(null, { status: 302, headers: { 'Location': successUrl } });
      } else {
        const legacyError = await legacyResponse.text();
        console.error('[fub-callback] Legacy GET also failed:', legacyResponse.status, legacyError);
      }
      
      const errorRedirect = origin
        ? `${origin}/integrations?fub=error&message=token_exchange_failed`
        : '/integrations?fub=error&message=token_exchange_failed';
      return new Response(null, { status: 302, headers: { 'Location': errorRedirect } });
    }

    const tokens = await tokenResponse.json();
    console.log('[fub-callback] Token exchange successful for user:', userId);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + (tokens.expires_in * 1000)).toISOString()
      : null;

    const { error: upsertError } = await supabaseAdmin
      .from('service_integrations')
      .upsert({
        user_id: userId,
        service_name: 'follow_up_boss',
        access_token_encrypted: tokens.access_token,
        refresh_token_encrypted: tokens.refresh_token || null,
        token_expires_at: expiresAt,
        is_connected: true,
        connected_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,service_name',
      });

    if (upsertError) {
      console.error('[fub-callback] Failed to store tokens:', upsertError);
      const errorRedirect = origin
        ? `${origin}/integrations?fub=error&message=storage_failed`
        : '/integrations?fub=error&message=storage_failed';
      return new Response(null, { status: 302, headers: { 'Location': errorRedirect } });
    }

    console.log('[fub-callback] Tokens stored successfully for user:', userId);

    const baseUrl = origin || '';
    const redirectUrl = baseUrl
      ? `${baseUrl}/integrations?fub=success`
      : '/integrations?fub=success';

    return new Response(null, { status: 302, headers: { 'Location': redirectUrl } });
  } catch (error) {
    console.error('[fub-callback] Error:', error);
    return new Response(null, {
      status: 302,
      headers: { 'Location': '/integrations?fub=error&message=unknown_error' },
    });
  }
});
