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

async function docuSignFetch(accessToken: string, baseUri: string, endpoint: string, options?: RequestInit): Promise<any> {
  const url = `${baseUri}/restapi/v2.1${endpoint}`;
  const resp = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error(`[sync-docusign] API error ${resp.status} for ${endpoint}:`, errText);
    if (resp.status === 401) {
      throw new Error('TOKEN_EXPIRED');
    }
    throw new Error(`DocuSign API error ${resp.status}: ${errText}`);
  }

  return resp.json();
}

// Variant for binary responses (PDF download)
async function docuSignFetchBinary(accessToken: string, baseUri: string, endpoint: string): Promise<ArrayBuffer> {
  const url = `${baseUri}/restapi/v2.1${endpoint}`;
  const resp = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/pdf',
    },
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error(`[sync-docusign] Binary API error ${resp.status} for ${endpoint}:`, errText);
    if (resp.status === 401) throw new Error('TOKEN_EXPIRED');
    throw new Error(`DocuSign API error ${resp.status}: ${errText}`);
  }

  return resp.arrayBuffer();
}

async function getAuthenticatedContext(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new Error('UNAUTHORIZED');
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!
  );

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) {
    throw new Error('UNAUTHORIZED');
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: integration, error: intError } = await supabaseAdmin
    .from('service_integrations')
    .select('access_token_encrypted, refresh_token_encrypted, token_expires_at')
    .eq('user_id', user.id)
    .eq('service_name', 'docusign')
    .eq('is_connected', true)
    .maybeSingle();

  if (intError || !integration?.access_token_encrypted) {
    throw new Error('DocuSign not connected. Please connect DocuSign first.');
  }

  let accessToken = integration.access_token_encrypted;
  const refreshToken = integration.refresh_token_encrypted;

  // Refresh token if expired
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
        throw new Error('DocuSign session expired. Please reconnect.');
      }
    }
  }

  // Get user info for account ID and base URI
  const userInfoResp = await fetch('https://account.docusign.com/oauth/userinfo', {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });

  if (!userInfoResp.ok) {
    const errText = await userInfoResp.text();
    console.error('[sync-docusign] UserInfo error:', userInfoResp.status, errText);

    if (userInfoResp.status === 401 && refreshToken) {
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
        throw new Error('DocuSign session expired. Please reconnect.');
      }
    } else {
      throw new Error('Failed to get DocuSign account info');
    }
  }

  // Re-fetch with potentially refreshed token
  const finalUserInfoResp = await fetch('https://account.docusign.com/oauth/userinfo', {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });

  if (!finalUserInfoResp.ok) {
    await finalUserInfoResp.text();
    throw new Error('Failed to retrieve DocuSign account');
  }

  const userInfo = await finalUserInfoResp.json();
  const defaultAccount = userInfo.accounts?.find((a: any) => a.is_default) || userInfo.accounts?.[0];

  if (!defaultAccount) {
    throw new Error('No DocuSign account found');
  }

  return {
    user,
    accessToken,
    accountId: defaultAccount.account_id,
    baseUri: defaultAccount.base_uri,
    supabaseAdmin,
    senderName: userInfo.name || '',
    senderEmail: userInfo.email || '',
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ctx = await getAuthenticatedContext(req).catch((e) => {
      if (e.message === 'UNAUTHORIZED') {
        throw { status: 401, message: 'Missing or invalid authorization' };
      }
      throw { status: 400, message: e.message };
    });

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'fetch_envelopes';
    let responseData: any = {};

    // ===== FETCH ENVELOPES =====
    if (action === 'fetch_envelopes') {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 90);

      const envelopesData = await docuSignFetch(
        ctx.accessToken,
        ctx.baseUri,
        `/accounts/${ctx.accountId}/envelopes?from_date=${fromDate.toISOString()}&count=50&order_by=last_modified&order=desc`
      );

      responseData.envelopes = (envelopesData.envelopes || []).map((e: any) => ({
        envelopeId: e.envelopeId,
        subject: e.emailSubject || 'Untitled',
        status: e.status,
        statusChangedDateTime: e.statusChangedDateTime,
        sentDateTime: e.sentDateTime,
        completedDateTime: e.completedDateTime,
        createdDateTime: e.createdDateTime,
      }));
      console.log(`[sync-docusign] Fetched ${responseData.envelopes.length} envelopes for user ${ctx.user.id}`);
    }

    // ===== FETCH ENVELOPE DETAILS =====
    if (action === 'fetch_envelope_details') {
      const envelopeId = body.envelopeId;
      if (!envelopeId) {
        return new Response(
          JSON.stringify({ error: 'envelopeId required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const [envelopeDetail, recipients] = await Promise.all([
        docuSignFetch(ctx.accessToken, ctx.baseUri, `/accounts/${ctx.accountId}/envelopes/${envelopeId}`),
        docuSignFetch(ctx.accessToken, ctx.baseUri, `/accounts/${ctx.accountId}/envelopes/${envelopeId}/recipients`),
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

    // ===== SEND ENVELOPE (multi-doc, responsive signing, reminders/expirations) =====
    if (action === 'send_envelope') {
      const { recipients, documents, emailSubject, emailBlurb, taskId, buyerId, listingId, enableReminders, enableExpiration } = body;

      // Support legacy single-document format
      const documentBase64 = body.documentBase64;
      const documentName = body.documentName;

      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return new Response(
          JSON.stringify({ error: 'At least one recipient is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Build documents array (multi-doc or single-doc)
      let envelopeDocuments: any[];
      let primaryDocumentName: string;

      if (documents && Array.isArray(documents) && documents.length > 0) {
        envelopeDocuments = documents.map((doc: any, idx: number) => ({
          documentBase64: doc.documentBase64,
          name: doc.documentName,
          fileExtension: doc.documentName.split('.').pop() || 'pdf',
          documentId: doc.documentId || String(idx + 1),
        }));
        primaryDocumentName = documents[0].documentName;
      } else if (documentBase64 && documentName) {
        envelopeDocuments = [{
          documentBase64,
          name: documentName,
          fileExtension: documentName.split('.').pop() || 'pdf',
          documentId: '1',
        }];
        primaryDocumentName = documentName;
      } else {
        return new Response(
          JSON.stringify({ error: 'At least one document is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Build signers with tabs for each document
      const signers = recipients.map((r: any, idx: number) => {
        const signHereTabs = envelopeDocuments.map((doc: any) => ({
          documentId: doc.documentId,
          pageNumber: '1',
          xPosition: '100',
          yPosition: '700',
        }));

        return {
          email: r.email,
          name: r.name,
          recipientId: String(idx + 1),
          routingOrder: String(idx + 1),
          tabs: { signHereTabs },
        };
      });

      // Build envelope definition
      const envelopeDefinition: any = {
        emailSubject: emailSubject || `Please sign: ${primaryDocumentName}`,
        emailBlurb: emailBlurb || 'Please review and sign the attached document.',
        documents: envelopeDocuments,
        recipients: { signers },
        status: 'sent',
      };

      // Enable responsive signing for mobile-optimized signing experience
      envelopeDefinition.recipientViewRequest = { returnUrl: '' };
      // Set envelope-level responsive signing
      for (const signer of signers) {
        signer.clientUserId = undefined; // Ensure remote signing (not embedded)
      }

      // Add notification settings (reminders & expirations)
      const notification: any = { useAccountDefaults: 'false' };

      if (enableReminders !== false) {
        notification.reminders = {
          reminderEnabled: 'true',
          reminderDelay: '3',       // days before first reminder
          reminderFrequency: '5',   // days between subsequent reminders
        };
      }

      if (enableExpiration !== false) {
        notification.expirations = {
          expireEnabled: 'true',
          expireAfter: '30',        // days until expiration
          expireWarn: '3',          // days before expiration to warn
        };
      }

      envelopeDefinition.notification = notification;

      console.log(`[sync-docusign] Sending envelope "${emailSubject || primaryDocumentName}" with ${envelopeDocuments.length} doc(s) to ${recipients.length} recipients`);

      const result = await docuSignFetch(
        ctx.accessToken,
        ctx.baseUri,
        `/accounts/${ctx.accountId}/envelopes`,
        {
          method: 'POST',
          body: JSON.stringify(envelopeDefinition),
        }
      );

      console.log(`[sync-docusign] Envelope created: ${result.envelopeId}, status: ${result.status}`);

      // Store in tracking table
      await ctx.supabaseAdmin
        .from('docusign_envelopes')
        .insert({
          user_id: ctx.user.id,
          envelope_id: result.envelopeId,
          subject: emailSubject || `Please sign: ${primaryDocumentName}`,
          status: result.status || 'sent',
          task_id: taskId || null,
          buyer_id: buyerId || null,
          listing_id: listingId || null,
          recipients: recipients,
          document_name: envelopeDocuments.map((d: any) => d.name).join(', '),
          sent_at: new Date().toISOString(),
        });

      responseData = {
        envelopeId: result.envelopeId,
        status: result.status,
        statusDateTime: result.statusDateTime,
        uri: result.uri,
      };
    }

    // ===== CHECK ENVELOPE STATUS =====
    if (action === 'check_status') {
      const envelopeId = body.envelopeId;
      if (!envelopeId) {
        return new Response(
          JSON.stringify({ error: 'envelopeId required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const [envelopeDetail, recipients] = await Promise.all([
        docuSignFetch(ctx.accessToken, ctx.baseUri, `/accounts/${ctx.accountId}/envelopes/${envelopeId}`),
        docuSignFetch(ctx.accessToken, ctx.baseUri, `/accounts/${ctx.accountId}/envelopes/${envelopeId}/recipients`),
      ]);

      const status = envelopeDetail.status;

      const updateData: any = { status };
      if (status === 'completed') updateData.completed_at = envelopeDetail.completedDateTime;
      if (status === 'voided') updateData.voided_at = envelopeDetail.voidedDateTime;

      await ctx.supabaseAdmin
        .from('docusign_envelopes')
        .update(updateData)
        .eq('user_id', ctx.user.id)
        .eq('envelope_id', envelopeId);

      responseData = {
        envelopeId,
        status,
        sentDateTime: envelopeDetail.sentDateTime,
        completedDateTime: envelopeDetail.completedDateTime,
        voidedDateTime: envelopeDetail.voidedDateTime,
        signers: (recipients.signers || []).map((s: any) => ({
          name: s.name,
          email: s.email,
          status: s.status,
          signedDateTime: s.signedDateTime,
        })),
      };
    }

    // ===== DOWNLOAD SIGNED DOCUMENT (combined PDF) =====
    if (action === 'download_document') {
      const envelopeId = body.envelopeId;
      if (!envelopeId) {
        return new Response(
          JSON.stringify({ error: 'envelopeId required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Download combined document (all documents merged into one PDF)
      const pdfBuffer = await docuSignFetchBinary(
        ctx.accessToken,
        ctx.baseUri,
        `/accounts/${ctx.accountId}/envelopes/${envelopeId}/documents/combined`
      );

      // Convert to base64 for JSON transport
      const bytes = new Uint8Array(pdfBuffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const documentBase64 = btoa(binary);

      console.log(`[sync-docusign] Downloaded combined PDF for envelope ${envelopeId} (${bytes.length} bytes)`);

      responseData = { documentBase64 };
    }

    return new Response(
      JSON.stringify({ success: true, data: responseData }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[sync-docusign] Error:', error);
    const status = error?.status || 500;
    const message = error?.message || (error instanceof Error ? error.message : 'Unknown error');
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
