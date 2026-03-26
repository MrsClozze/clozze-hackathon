import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

async function storeTokens(userId: string, tokenData: any, origin: string) {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const expiresAt = tokenData.expires_in
    ? new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString()
    : null;

  const { error } = await supabaseAdmin
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

  if (error) {
    console.error('[fub-callback] Failed to store tokens:', error);
    throw error;
  }
  console.log('[fub-callback] Tokens stored successfully for user:', userId);
}

function buildRedirect(origin: string, params: string) {
  return origin ? `${origin}/integrations?${params}` : `/integrations?${params}`;
}

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
        try { origin = JSON.parse(atob(state)).origin || ''; } catch (_e) { /* */ }
      }
      return new Response(null, { status: 302, headers: { 'Location': buildRedirect(origin, 'fub=denied') } });
    }

    if (!code || !state) {
      console.error('[fub-callback] Missing code or state');
      return new Response(null, { status: 302, headers: { 'Location': '/integrations?fub=error&message=missing_params' } });
    }

    let stateData;
    try { stateData = JSON.parse(atob(state)); } catch (_e) {
      return new Response(null, { status: 302, headers: { 'Location': '/integrations?fub=error&message=invalid_state' } });
    }

    const { userId, origin } = stateData;
    if (!userId) {
      return new Response(null, { status: 302, headers: { 'Location': '/integrations?fub=error&message=no_user' } });
    }

    const FUB_CLIENT_ID = Deno.env.get('FUB_CLIENT_ID');
    const FUB_CLIENT_SECRET = Deno.env.get('FUB_CLIENT_SECRET');
    const FUB_X_SYSTEM = Deno.env.get('FUB_X_SYSTEM');
    const FUB_X_SYSTEM_KEY = Deno.env.get('FUB_X_SYSTEM_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');

    if (!FUB_CLIENT_ID || !FUB_CLIENT_SECRET) {
      console.error('[fub-callback] Missing FUB credentials');
      return new Response(null, { status: 302, headers: { 'Location': buildRedirect(origin, 'fub=error&message=config_error') } });
    }

    const redirectUri = `${SUPABASE_URL}/functions/v1/fub-callback`;
    const basicAuth = btoa(`${FUB_CLIENT_ID}:${FUB_CLIENT_SECRET}`);

    console.log('[fub-callback] Starting token exchange. Code length:', code.length);
    console.log('[fub-callback] Has X-System:', !!FUB_X_SYSTEM, 'Has X-System-Key:', !!FUB_X_SYSTEM_KEY);

    // Strategy 1: POST to app.followupboss.com with Basic Auth + X-System headers (official docs + system headers)
    console.log('[fub-callback] Strategy 1: POST app.followupboss.com with Basic Auth + X-System headers');
    const formBody = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    });

    const resp1 = await fetch('https://app.followupboss.com/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(FUB_X_SYSTEM ? { 'x-system': FUB_X_SYSTEM } : {}),
        ...(FUB_X_SYSTEM_KEY ? { 'X-System-Key': FUB_X_SYSTEM_KEY } : {}),
      },
      body: formBody.toString(),
    });

    if (resp1.ok) {
      const tokens = await resp1.json();
      console.log('[fub-callback] Strategy 1 succeeded!');
      const tokenData = tokens.data || tokens;
      await storeTokens(userId, tokenData, origin);
      return new Response(null, { status: 302, headers: { 'Location': buildRedirect(origin, 'fub=success') } });
    }
    const err1 = await resp1.text();
    console.error('[fub-callback] Strategy 1 failed:', resp1.status, err1);

    // Strategy 2: POST to api.followupboss.com with credentials in body + X-System headers
    console.log('[fub-callback] Strategy 2: POST api.followupboss.com with body credentials + X-System headers');
    const bodyWithCreds = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: FUB_CLIENT_ID,
      client_secret: FUB_CLIENT_SECRET,
    });

    const resp2 = await fetch('https://api.followupboss.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(FUB_X_SYSTEM ? { 'x-system': FUB_X_SYSTEM } : {}),
        ...(FUB_X_SYSTEM_KEY ? { 'X-System-Key': FUB_X_SYSTEM_KEY } : {}),
      },
      body: bodyWithCreds.toString(),
    });

    if (resp2.ok) {
      const tokens = await resp2.json();
      console.log('[fub-callback] Strategy 2 succeeded!');
      const tokenData = tokens.data || tokens;
      await storeTokens(userId, tokenData, origin);
      return new Response(null, { status: 302, headers: { 'Location': buildRedirect(origin, 'fub=success') } });
    }
    const err2 = await resp2.text();
    console.error('[fub-callback] Strategy 2 failed:', resp2.status, err2);

    // Strategy 3: POST to api.followupboss.com with Basic Auth + X-System headers
    console.log('[fub-callback] Strategy 3: POST api.followupboss.com with Basic Auth + X-System headers');
    const resp3 = await fetch('https://api.followupboss.com/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(FUB_X_SYSTEM ? { 'x-system': FUB_X_SYSTEM } : {}),
        ...(FUB_X_SYSTEM_KEY ? { 'X-System-Key': FUB_X_SYSTEM_KEY } : {}),
      },
      body: formBody.toString(),
    });

    if (resp3.ok) {
      const tokens = await resp3.json();
      console.log('[fub-callback] Strategy 3 succeeded!');
      const tokenData = tokens.data || tokens;
      await storeTokens(userId, tokenData, origin);
      return new Response(null, { status: 302, headers: { 'Location': buildRedirect(origin, 'fub=success') } });
    }
    const err3 = await resp3.text();
    console.error('[fub-callback] Strategy 3 failed:', resp3.status, err3);

    // Strategy 4: Legacy GET to app.followupboss.com with state
    console.log('[fub-callback] Strategy 4: Legacy GET with state');
    const legacyUrl = new URL('https://app.followupboss.com/oauth/token');
    legacyUrl.searchParams.set('grant_type', 'auth_code');
    legacyUrl.searchParams.set('code', code);
    legacyUrl.searchParams.set('redirect_uri', redirectUri);
    legacyUrl.searchParams.set('state', state);

    const resp4 = await fetch(legacyUrl.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        ...(FUB_X_SYSTEM ? { 'x-system': FUB_X_SYSTEM } : {}),
        ...(FUB_X_SYSTEM_KEY ? { 'X-System-Key': FUB_X_SYSTEM_KEY } : {}),
      },
    });

    if (resp4.ok) {
      const tokens = await resp4.json();
      console.log('[fub-callback] Strategy 4 succeeded!');
      const tokenData = tokens.data || tokens;
      await storeTokens(userId, tokenData, origin);
      return new Response(null, { status: 302, headers: { 'Location': buildRedirect(origin, 'fub=success') } });
    }
    const err4 = await resp4.text();
    console.error('[fub-callback] Strategy 4 failed:', resp4.status, err4);

    console.error('[fub-callback] All token exchange strategies failed');
    return new Response(null, { status: 302, headers: { 'Location': buildRedirect(origin, 'fub=error&message=token_exchange_failed') } });
  } catch (error) {
    console.error('[fub-callback] Error:', error);
    return new Response(null, { status: 302, headers: { 'Location': '/integrations?fub=error&message=unknown_error' } });
  }
});
