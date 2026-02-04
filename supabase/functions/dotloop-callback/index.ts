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
      return createRedirectResponse('/integrations?dotloop=denied');
    }

    if (!code || !state) {
      console.error('[dotloop-callback] Missing code or state');
      return createRedirectResponse('/integrations?dotloop=error&message=missing_params');
    }

    // Decode state
    let stateData;
    try {
      stateData = JSON.parse(atob(state));
    } catch (e) {
      console.error('[dotloop-callback] Invalid state:', e);
      return createRedirectResponse('/integrations?dotloop=error&message=invalid_state');
    }

    const { userId, origin } = stateData;
    if (!userId) {
      console.error('[dotloop-callback] No userId in state');
      return createRedirectResponse('/integrations?dotloop=error&message=no_user');
    }

    const DOTLOOP_CLIENT_ID = Deno.env.get('DOTLOOP_CLIENT_ID');
    const DOTLOOP_CLIENT_SECRET = Deno.env.get('DOTLOOP_CLIENT_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');

    if (!DOTLOOP_CLIENT_ID || !DOTLOOP_CLIENT_SECRET) {
      console.error('[dotloop-callback] Missing Dotloop credentials');
      return createRedirectResponse('/integrations?dotloop=error&message=config_error');
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
      return createRedirectResponse('/integrations?dotloop=error&message=token_exchange_failed');
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
      return createRedirectResponse('/integrations?dotloop=error&message=storage_failed');
    }

    console.log('[dotloop-callback] Tokens stored successfully for user:', userId);

    // Redirect back to integrations page with success
    const redirectUrl = origin 
      ? `${origin}/integrations?dotloop=success`
      : '/integrations?dotloop=success';

    return createRedirectResponse(redirectUrl);
  } catch (error) {
    console.error('[dotloop-callback] Error:', error);
    return createRedirectResponse('/integrations?dotloop=error&message=unknown_error');
  }
});

function createRedirectResponse(path: string): Response {
  // If path is a full URL, use it directly; otherwise, construct relative redirect
  const isFullUrl = path.startsWith('http');
  
  return new Response(
    `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Redirecting...</title>
</head>
<body>
  <script>
    // Post message to opener if in popup
    if (window.opener) {
      window.opener.postMessage({ type: 'dotloop-callback', url: '${path}' }, '*');
      window.close();
    } else {
      window.location.href = '${isFullUrl ? path : path}';
    }
  </script>
  <noscript>
    <meta http-equiv="refresh" content="0;url=${path}">
  </noscript>
  <p>Redirecting...</p>
</body>
</html>`,
    {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    }
  );
}
