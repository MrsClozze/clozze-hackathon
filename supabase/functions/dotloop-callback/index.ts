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
  const isFullUrl = path.startsWith('http');
  const isSuccess = path.includes('dotloop=success');
  const isDenied = path.includes('dotloop=denied');
  const isError = path.includes('dotloop=error');
  
  // Create user-friendly messages
  let title = 'Connecting...';
  let message = 'Completing your Dotloop connection...';
  // Avoid unicode/encoding issues by using HTML entities rather than emoji characters.
  let iconHtml = '&#x1F504;'; // 🔄
  
  if (isSuccess) {
    title = 'Connected!';
    message = 'Your Dotloop account has been linked successfully. This window will close automatically.';
    iconHtml = '&#x2705;'; // ✅
  } else if (isDenied) {
    title = 'Connection Cancelled';
    message = 'You chose not to connect Dotloop. This window will close automatically.';
    iconHtml = '&#x274C;'; // ❌
  } else if (isError) {
    title = 'Connection Failed';
    message = 'There was a problem connecting to Dotloop. Please try again.';
    iconHtml = '&#x26A0;&#xFE0F;'; // ⚠️
  }
  
  return new Response(
    `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
    }
    .container {
      text-align: center;
      padding: 40px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      backdrop-filter: blur(10px);
      max-width: 400px;
      margin: 20px;
    }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 24px; margin-bottom: 12px; font-weight: 600; }
    p { font-size: 14px; opacity: 0.8; line-height: 1.5; }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(255,255,255,0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 20px auto 0;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon" aria-hidden="true">${iconHtml}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <p style="margin-top:12px; font-size:12px; opacity:0.75;">
      Note: seeing a URL with a <code style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">code=...</code>
      parameter is normal during OAuth—it's exchanged for tokens behind the scenes.
    </p>
    ${!isError && !isDenied ? '<div class="spinner"></div>' : ''}
  </div>
  <script>
    (function() {
      var path = '${path}';
      var isFullUrl = ${isFullUrl};
      
      // Try to post message to opener and close
      if (window.opener) {
        try {
          window.opener.postMessage({ type: 'dotloop-callback', url: path }, '*');
          // Give a moment for the message to be received, then close
          setTimeout(function() {
            window.close();
          }, 500);
        } catch (e) {
          console.error('postMessage failed:', e);
          // Fallback: redirect after delay
          setTimeout(function() {
            window.location.href = isFullUrl ? path : path;
          }, 2000);
        }
      } else {
        // No opener - redirect after showing the message briefly
        setTimeout(function() {
          window.location.href = isFullUrl ? path : path;
        }, 1500);
      }
      
      // Fallback: if window doesn't close after 5 seconds, redirect
      setTimeout(function() {
        if (!window.closed) {
          window.location.href = isFullUrl ? path : path;
        }
      }, 5000);
    })();
  </script>
  <noscript>
    <meta http-equiv="refresh" content="2;url=${path}">
  </noscript>
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
