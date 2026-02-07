import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function refreshDocuSignToken(refreshToken: string): Promise<{ access_token: string; refresh_token?: string; expires_in?: number } | null> {
  const integrationKey = Deno.env.get('DOCUSIGN_INTEGRATION_KEY');
  const secretKey = Deno.env.get('DOCUSIGN_SECRET_KEY');
  if (!integrationKey || !secretKey) return null;

  try {
    const resp = await fetch('https://account.docusign.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${integrationKey}:${secretKey}`)}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    const text = await resp.text();
    if (resp.ok) {
      const data = JSON.parse(text);
      if (data.access_token) {
        console.log('[sync-docusign] Token refresh successful');
        return data;
      }
    }
    console.error('[sync-docusign] Token refresh failed:', resp.status, text);
  } catch (e) {
    console.error('[sync-docusign] Token refresh error:', e);
  }
  return null;
}

async function docuSignFetch(accessToken: string, baseUri: string, endpoint: string): Promise<any> {
  const resp = await fetch(`${baseUri}/restapi/v2.1${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error(`[sync-docusign] API error ${resp.status} for ${endpoint}:`, errText);
    if (resp.status === 401) {
      throw new Error('TOKEN_EXPIRED');
    }
    throw new Error(`DocuSign API error ${resp.status}`);
  }

  return resp.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid user session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get DocuSign credentials
    const { data: integration, error: intError } = await supabaseAdmin
      .from('service_integrations')
      .select('access_token_encrypted, refresh_token_encrypted, token_expires_at')
      .eq('user_id', user.id)
      .eq('service_name', 'docusign')
      .eq('is_connected', true)
      .maybeSingle();

    if (intError || !integration?.access_token_encrypted) {
      return new Response(
        JSON.stringify({ error: 'DocuSign not connected. Please connect DocuSign first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let accessToken = integration.access_token_encrypted;
    const refreshToken = integration.refresh_token_encrypted;

    // Check if token expired and refresh proactively
    if (integration.token_expires_at) {
      const expiresAt = new Date(integration.token_expires_at);
      if (new Date() >= expiresAt && refreshToken) {
        console.log('[sync-docusign] Token expired, refreshing...');
        const newTokens = await refreshDocuSignToken(refreshToken);
        if (newTokens) {
          accessToken = newTokens.access_token;
          const newExpires = newTokens.expires_in
            ? new Date(Date.now() + newTokens.expires_in * 1000).toISOString()
            : null;
          await supabaseAdmin
            .from('service_integrations')
            .update({
              access_token_encrypted: newTokens.access_token,
              refresh_token_encrypted: newTokens.refresh_token || refreshToken,
              token_expires_at: newExpires,
            })
            .eq('user_id', user.id)
            .eq('service_name', 'docusign');
        } else {
          return new Response(
            JSON.stringify({ error: 'DocuSign session expired. Please reconnect.' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Get user info to find account ID and base URI
    const userInfoResp = await fetch('https://account.docusign.com/oauth/userinfo', {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!userInfoResp.ok) {
      const errText = await userInfoResp.text();
      console.error('[sync-docusign] UserInfo error:', userInfoResp.status, errText);
      if (userInfoResp.status === 401 && refreshToken) {
        // Try refresh
        const newTokens = await refreshDocuSignToken(refreshToken);
        if (newTokens) {
          accessToken = newTokens.access_token;
          await supabaseAdmin
            .from('service_integrations')
            .update({
              access_token_encrypted: newTokens.access_token,
              refresh_token_encrypted: newTokens.refresh_token || refreshToken,
              token_expires_at: newTokens.expires_in
                ? new Date(Date.now() + newTokens.expires_in * 1000).toISOString()
                : null,
            })
            .eq('user_id', user.id)
            .eq('service_name', 'docusign');
        } else {
          return new Response(
            JSON.stringify({ error: 'DocuSign session expired. Please reconnect.' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        return new Response(
          JSON.stringify({ error: 'Failed to get DocuSign account info' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    let accountId = '';
    let baseUri = '';

    // Re-fetch user info with potentially refreshed token
    const finalUserInfoResp = await fetch('https://account.docusign.com/oauth/userinfo', {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (finalUserInfoResp.ok) {
      const userInfo = await finalUserInfoResp.json();
      const defaultAccount = userInfo.accounts?.find((a: any) => a.is_default) || userInfo.accounts?.[0];
      if (defaultAccount) {
        accountId = defaultAccount.account_id;
        baseUri = defaultAccount.base_uri;
      }
    } else {
      await finalUserInfoResp.text();
      return new Response(
        JSON.stringify({ error: 'Failed to retrieve DocuSign account' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!accountId || !baseUri) {
      return new Response(
        JSON.stringify({ error: 'No DocuSign account found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'fetch_envelopes';

    let responseData: any = {};

    if (action === 'fetch_envelopes') {
      // Fetch recent envelopes (last 30 days)
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 90);
      const fromDateStr = fromDate.toISOString();

      const envelopesData = await docuSignFetch(
        accessToken,
        baseUri,
        `/accounts/${accountId}/envelopes?from_date=${fromDateStr}&count=50&order_by=last_modified&order=desc`
      );

      const envelopes = (envelopesData.envelopes || []).map((e: any) => ({
        envelopeId: e.envelopeId,
        subject: e.emailSubject || 'Untitled',
        status: e.status,
        statusChangedDateTime: e.statusChangedDateTime,
        sentDateTime: e.sentDateTime,
        completedDateTime: e.completedDateTime,
        createdDateTime: e.createdDateTime,
      }));

      responseData.envelopes = envelopes;
      console.log(`[sync-docusign] Fetched ${envelopes.length} envelopes for user ${user.id}`);
    }

    if (action === 'fetch_envelope_details') {
      const envelopeId = body.envelopeId;
      if (!envelopeId) {
        return new Response(
          JSON.stringify({ error: 'envelopeId required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get envelope details including recipients
      const [envelopeDetail, recipients] = await Promise.all([
        docuSignFetch(accessToken, baseUri, `/accounts/${accountId}/envelopes/${envelopeId}`),
        docuSignFetch(accessToken, baseUri, `/accounts/${accountId}/envelopes/${envelopeId}/recipients`),
      ]);

      responseData.envelope = {
        envelopeId: envelopeDetail.envelopeId,
        subject: envelopeDetail.emailSubject || 'Untitled',
        status: envelopeDetail.status,
        sentDateTime: envelopeDetail.sentDateTime,
        completedDateTime: envelopeDetail.completedDateTime,
        signers: (recipients.signers || []).map((s: any) => ({
          name: s.name,
          email: s.email,
          status: s.status,
          signedDateTime: s.signedDateTime,
        })),
      };
    }

    return new Response(
      JSON.stringify({ success: true, data: responseData }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[sync-docusign] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
