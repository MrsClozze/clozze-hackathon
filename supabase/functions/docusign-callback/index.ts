import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    if (error) {
      return new Response(
        `<html><body><script>window.opener.postMessage({ type: 'docusign-error', error: '${error}' }, '*'); window.close();</script></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    if (!code) {
      throw new Error('No authorization code received');
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

    // Send token data to parent window and close popup
    return new Response(
      `<html>
        <body>
          <script>
            window.opener.postMessage({
              type: 'docusign-success',
              accessToken: '${tokenData.access_token}',
              refreshToken: '${tokenData.refresh_token || ''}',
              expiresIn: ${tokenData.expires_in}
            }, '*');
            window.close();
          </script>
          <p>Authentication successful! This window will close automatically...</p>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  } catch (error) {
    console.error('DocuSign callback error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      `<html><body><script>window.opener.postMessage({ type: 'docusign-error', error: '${errorMessage}' }, '*'); window.close();</script><p>Error: ${errorMessage}</p></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
});
