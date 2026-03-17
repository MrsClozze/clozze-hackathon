import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface StateData {
  origin?: string;
  userId?: string;
  codeVerifier?: string;
}

const parseState = (stateParam: string | null): StateData => {
  if (!stateParam) return {};
  try {
    return JSON.parse(atob(stateParam));
  } catch {
    return {};
  }
};

const buildRedirect = (origin: string, status: string, message?: string) => {
  const url = new URL(`${origin}/integrations`);
  url.searchParams.set('docusign', status);
  if (message) url.searchParams.set('message', message.substring(0, 200));
  return Response.redirect(url.toString(), 302);
};

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');
    const stateParam = url.searchParams.get('state');

    const stateData = parseState(stateParam);
    const userId = stateData.userId;
    const codeVerifier = stateData.codeVerifier;

    if (error) {
      return htmlResponse(`DocuSign error: ${error.substring(0, 200)}. You can close this window.`);
    }

    if (!code || !userId) {
      return htmlResponse('Missing authorization info. You can close this window.');
    }

    const integrationKey = Deno.env.get('DOCUSIGN_INTEGRATION_KEY');
    const secretKey = Deno.env.get('DOCUSIGN_SECRET_KEY');
    if (!integrationKey || !secretKey) {
      throw new Error('DocuSign credentials not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const redirectUri = `${supabaseUrl}/functions/v1/docusign-callback`;

    // Build token exchange body with PKCE code_verifier
    const tokenBody = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    });
    if (codeVerifier) {
      tokenBody.set('code_verifier', codeVerifier);
    }

    // Demo/sandbox DocuSign URL (use account.docusign.com for production)
    const tokenResponse = await fetch('https://account-d.docusign.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${integrationKey}:${secretKey}`)}`,
      },
      body: tokenBody,
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error('[docusign-callback] Token exchange failed:', errText);
      return htmlResponse('Failed to connect. You can close this window.');
    }

    const tokenData = await tokenResponse.json();
    console.log('[docusign-callback] Token exchange successful');

    // Get DocuSign user info to retrieve account ID
    const userInfoResponse = await fetch('https://account-d.docusign.com/oauth/userinfo', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` },
    });

    let accountId = '';
    let baseUri = '';
    if (userInfoResponse.ok) {
      const userInfo = await userInfoResponse.json();
      const defaultAccount = userInfo.accounts?.find((a: any) => a.is_default) || userInfo.accounts?.[0];
      if (defaultAccount) {
        accountId = defaultAccount.account_id;
        baseUri = defaultAccount.base_uri;
        console.log('[docusign-callback] Account ID:', accountId, 'Base URI:', baseUri);
      }
    } else {
      await userInfoResponse.text();
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
      return htmlResponse('Failed to store credentials. You can close this window.');
    }

    console.log('[docusign-callback] Tokens stored for user:', userId);

    // Return a minimal self-closing page (no app branding in popup)
    return htmlResponse('DocuSign connected successfully! This window will close automatically.');
  } catch (error) {
    console.error('[docusign-callback] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return htmlResponse(`Error: ${errorMessage.substring(0, 200)}. You can close this window.`);
  }
});
