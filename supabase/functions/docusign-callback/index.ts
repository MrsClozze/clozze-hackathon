import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

const escapeHtml = (str: string): string => {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  };
  return str.replace(/[&<>"']/g, (char) => htmlEscapes[char] || char);
};

interface StateData {
  origin?: string;
  userId?: string;
}

const parseState = (stateParam: string | null): StateData => {
  if (!stateParam) return {};
  try {
    return JSON.parse(atob(stateParam));
  } catch {
    return {};
  }
};

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');
    const stateParam = url.searchParams.get('state');

    const stateData = parseState(stateParam);
    const allowedOrigin = stateData.origin || Deno.env.get('SUPABASE_URL') || '';
    const userId = stateData.userId;
    const safeOrigin = escapeJs(allowedOrigin);

    if (error) {
      const safeError = escapeJs(error.substring(0, 200));
      return new Response(
        `<!DOCTYPE html><html><head><meta charset="utf-8"><title>DocuSign</title></head><body>
<script>window.opener.postMessage({ type: 'docusign-error', error: '${safeError}' }, '${safeOrigin}');window.close();</script>
<p>Authentication error. This window will close.</p></body></html>`,
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    if (!code || !userId) {
      throw new Error('Missing authorization code or user info');
    }

    const integrationKey = Deno.env.get('DOCUSIGN_INTEGRATION_KEY');
    const secretKey = Deno.env.get('DOCUSIGN_SECRET_KEY');
    if (!integrationKey || !secretKey) {
      throw new Error('DocuSign credentials not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const redirectUri = `${supabaseUrl}/functions/v1/docusign-callback`;

    // Exchange code for tokens — production URL
    const tokenResponse = await fetch('https://account.docusign.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${integrationKey}:${secretKey}`)}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error('[docusign-callback] Token exchange failed:', errText);
      throw new Error('Failed to exchange authorization code');
    }

    const tokenData = await tokenResponse.json();
    console.log('[docusign-callback] Token exchange successful');

    // Get DocuSign user info to retrieve account ID
    const userInfoResponse = await fetch('https://account.docusign.com/oauth/userinfo', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` },
    });

    let accountId = '';
    let baseUri = '';
    if (userInfoResponse.ok) {
      const userInfo = await userInfoResponse.json();
      // Use the default account
      const defaultAccount = userInfo.accounts?.find((a: any) => a.is_default) || userInfo.accounts?.[0];
      if (defaultAccount) {
        accountId = defaultAccount.account_id;
        baseUri = defaultAccount.base_uri;
        console.log('[docusign-callback] Account ID:', accountId, 'Base URI:', baseUri);
      }
    } else {
      await userInfoResponse.text(); // consume body
      console.warn('[docusign-callback] Could not fetch user info');
    }

    // Store tokens in service_integrations using encrypted columns
    const supabaseAdmin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : null;

    const { error: dbError } = await supabaseAdmin
      .from('service_integrations')
      .upsert({
        user_id: userId,
        service_name: 'docusign',
        access_token_encrypted: tokenData.access_token,
        refresh_token_encrypted: tokenData.refresh_token || null,
        token_expires_at: expiresAt,
        is_connected: true,
        connected_at: new Date().toISOString(),
      }, { onConflict: 'user_id,service_name' });

    if (dbError) {
      console.error('[docusign-callback] DB error:', dbError);
      throw new Error('Failed to store credentials');
    }

    console.log('[docusign-callback] Tokens stored for user:', userId);

    // Send success to parent window
    const safeAccountId = escapeJs(accountId);
    const safeBaseUri = escapeJs(baseUri);

    return new Response(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><title>DocuSign</title></head><body>
<script>
  window.opener.postMessage({
    type: 'docusign-success',
    accountId: '${safeAccountId}',
    baseUri: '${safeBaseUri}'
  }, '${safeOrigin}');
  window.close();
</script>
<p>Authentication successful! This window will close.</p></body></html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  } catch (error) {
    console.error('[docusign-callback] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const safeErrorMessage = escapeJs(errorMessage.substring(0, 200));
    const safeHtmlError = escapeHtml(errorMessage.substring(0, 200));
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const safeOrigin = escapeJs(supabaseUrl);

    return new Response(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><title>DocuSign Error</title></head><body>
<script>window.opener.postMessage({ type: 'docusign-error', error: '${safeErrorMessage}' }, '${safeOrigin}');window.close();</script>
<p>Error: ${safeHtmlError}</p></body></html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
});
