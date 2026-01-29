import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// HTML escape function to prevent XSS in HTML responses
const escapeHtml = (str: string): string => {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '\\': '&#92;',
    '\n': '',
    '\r': '',
  };
  return str.replace(/[&<>"'\\\n\r]/g, (char) => htmlEscapes[char] || char);
};

// JavaScript string escape for embedding in script tags
const escapeJs = (str: string): string => {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/</g, '\\x3c')
    .replace(/>/g, '\\x3e');
};

// Parse and validate the state parameter to get the allowed origin
const parseStateOrigin = (stateParam: string | null): string => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  
  if (!stateParam) {
    return supabaseUrl;
  }
  
  try {
    const decoded = JSON.parse(atob(stateParam));
    if (decoded.origin && typeof decoded.origin === 'string') {
      // Validate it's a proper URL origin
      const url = new URL(decoded.origin);
      return url.origin;
    }
  } catch {
    console.warn('Failed to parse state parameter, using fallback origin');
  }
  
  return supabaseUrl;
};

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');
    const stateParam = url.searchParams.get('state');
    
    // Get the allowed origin from state parameter
    const allowedOrigin = parseStateOrigin(stateParam);
    const safeOrigin = escapeJs(allowedOrigin);

    if (error) {
      const safeError = escapeJs(error.substring(0, 200)); // Limit error length
      return new Response(
        `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>DocuSign Error</title></head>
<body>
<script>
  window.opener.postMessage({ type: 'docusign-error', error: '${safeError}' }, '${safeOrigin}');
  window.close();
</script>
<p>Authentication error. This window will close automatically.</p>
</body>
</html>`,
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    if (!code) {
      throw new Error('No authorization code received');
    }

    // Validate code format (alphanumeric with some special chars, reasonable length)
    if (!/^[a-zA-Z0-9._-]{10,500}$/.test(code)) {
      throw new Error('Invalid authorization code format');
    }

    const integrationKey = Deno.env.get('DOCUSIGN_INTEGRATION_KEY');
    const secretKey = Deno.env.get('DOCUSIGN_SECRET_KEY');

    if (!integrationKey || !secretKey) {
      throw new Error('DocuSign credentials not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const redirectUri = `${supabaseUrl}/functions/v1/docusign-callback`;

    // Exchange code for access token
    const tokenResponse = await fetch('https://account-d.docusign.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${integrationKey}:${secretKey}`)}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      throw new Error('Failed to exchange authorization code');
    }

    const tokenData = await tokenResponse.json();

    // Validate token data
    if (typeof tokenData.access_token !== 'string' || tokenData.access_token.length > 5000) {
      throw new Error('Invalid token response from DocuSign');
    }

    // Sanitize tokens for JavaScript embedding
    const safeAccessToken = escapeJs(tokenData.access_token);
    const safeRefreshToken = escapeJs(tokenData.refresh_token || '');
    const expiresIn = typeof tokenData.expires_in === 'number' ? tokenData.expires_in : 3600;

    // Send token data to parent window with specific origin (not wildcard)
    return new Response(
      `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>DocuSign Success</title></head>
<body>
<script>
  window.opener.postMessage({
    type: 'docusign-success',
    accessToken: '${safeAccessToken}',
    refreshToken: '${safeRefreshToken}',
    expiresIn: ${expiresIn}
  }, '${safeOrigin}');
  window.close();
</script>
<p>Authentication successful! This window will close automatically...</p>
</body>
</html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  } catch (error) {
    console.error('DocuSign callback error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const safeErrorMessage = escapeJs(errorMessage.substring(0, 200));
    const safeHtmlError = escapeHtml(errorMessage.substring(0, 200));
    
    // Use Supabase URL as fallback for error responses
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const safeOrigin = escapeJs(supabaseUrl);
    
    return new Response(
      `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>DocuSign Error</title></head>
<body>
<script>
  window.opener.postMessage({ type: 'docusign-error', error: '${safeErrorMessage}' }, '${safeOrigin}');
  window.close();
</script>
<p>Error: ${safeHtmlError}</p>
</body>
</html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
});