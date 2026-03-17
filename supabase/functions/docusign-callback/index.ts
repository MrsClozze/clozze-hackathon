import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const appOrigin = stateData.origin || '';
    const userId = stateData.userId;

    // Build redirect URL back to the app's integrations page
    const redirectBase = `${appOrigin}/integrations`;

    if (error) {
      const redirectUrl = `${redirectBase}?docusign=error&message=${encodeURIComponent(error.substring(0, 200))}`;
      return Response.redirect(redirectUrl, 302);
    }

    if (!code || !userId) {
      const redirectUrl = `${redirectBase}?docusign=error&message=${encodeURIComponent('Missing authorization code or user info')}`;
      return Response.redirect(redirectUrl, 302);
    }

    const integrationKey = Deno.env.get('DOCUSIGN_INTEGRATION_KEY');
    const secretKey = Deno.env.get('DOCUSIGN_SECRET_KEY');
    if (!integrationKey || !secretKey) {
      throw new Error('DocuSign credentials not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const redirectUri = `${supabaseUrl}/functions/v1/docusign-callback`;

    // Demo/sandbox DocuSign URL (use account.docusign.com for production)
    const tokenResponse = await fetch('https://account-d.docusign.com/oauth/token', {
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
      const redirectUrl = `${redirectBase}?docusign=error&message=${encodeURIComponent('Failed to exchange authorization code')}`;
      return Response.redirect(redirectUrl, 302);
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
      const redirectUrl = `${redirectBase}?docusign=error&message=${encodeURIComponent('Failed to store credentials')}`;
      return Response.redirect(redirectUrl, 302);
    }

    console.log('[docusign-callback] Tokens stored for user:', userId);

    // Redirect back to app with success
    const redirectUrl = `${redirectBase}?docusign=success`;
    return Response.redirect(redirectUrl, 302);
  } catch (error) {
    console.error('[docusign-callback] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const redirectUrl = `${supabaseUrl}?docusign=error&message=${encodeURIComponent(errorMessage.substring(0, 200))}`;
    return Response.redirect(redirectUrl, 302);
  }
});
