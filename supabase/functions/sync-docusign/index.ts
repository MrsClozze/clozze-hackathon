import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ===== Token helpers =====

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
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
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

// ===== API helpers =====

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
    if (resp.status === 401) throw new Error('TOKEN_EXPIRED');
    throw new Error(`DocuSign API error ${resp.status}: ${errText}`);
  }
  return resp.json();
}

async function docuSignFetchBinary(accessToken: string, baseUri: string, endpoint: string): Promise<ArrayBuffer> {
  const url = `${baseUri}/restapi/v2.1${endpoint}`;
  const resp = await fetch(url, {
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/pdf' },
  });
  if (!resp.ok) {
    const errText = await resp.text();
    console.error(`[sync-docusign] Binary API error ${resp.status} for ${endpoint}:`, errText);
    if (resp.status === 401) throw new Error('TOKEN_EXPIRED');
    throw new Error(`DocuSign API error ${resp.status}: ${errText}`);
  }
  return resp.arrayBuffer();
}

// ===== Auth context =====

async function getAuthenticatedContext(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) throw new Error('UNAUTHORIZED');

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!);
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) throw new Error('UNAUTHORIZED');

  const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

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
        const newExpires = newTokens.expires_in ? new Date(Date.now() + newTokens.expires_in * 1000).toISOString() : null;
        await supabaseAdmin.from('service_integrations').update({
          access_token_encrypted: newTokens.access_token,
          refresh_token_encrypted: newTokens.refresh_token || refreshToken,
          token_expires_at: newExpires,
        }).eq('user_id', user.id).eq('service_name', 'docusign');
      } else {
        throw new Error('DocuSign session expired. Please reconnect.');
      }
    }
  }

  // Get user info for account ID and base URI
  let userInfo: any = null;
  const fetchUserInfo = async (tok: string) => {
    const resp = await fetch('https://account.docusign.com/oauth/userinfo', {
      headers: { 'Authorization': `Bearer ${tok}` },
    });
    if (!resp.ok) return null;
    return resp.json();
  };

  userInfo = await fetchUserInfo(accessToken);

  if (!userInfo && refreshToken) {
    const newTokens = await refreshDocuSignToken(refreshToken);
    if (newTokens) {
      accessToken = newTokens.access_token;
      await supabaseAdmin.from('service_integrations').update({
        access_token_encrypted: newTokens.access_token,
        refresh_token_encrypted: newTokens.refresh_token || refreshToken,
        token_expires_at: newTokens.expires_in ? new Date(Date.now() + newTokens.expires_in * 1000).toISOString() : null,
      }).eq('user_id', user.id).eq('service_name', 'docusign');
      userInfo = await fetchUserInfo(accessToken);
    }
  }

  if (!userInfo) throw new Error('Failed to retrieve DocuSign account');

  const defaultAccount = userInfo.accounts?.find((a: any) => a.is_default) || userInfo.accounts?.[0];
  if (!defaultAccount) throw new Error('No DocuSign account found');

  return {
    user, accessToken, accountId: defaultAccount.account_id, baseUri: defaultAccount.base_uri,
    supabaseAdmin, senderName: userInfo.name || '', senderEmail: userInfo.email || '',
  };
}

// ===== Tab type mapping =====

function mapTabType(type: string): string {
  const mapping: Record<string, string> = {
    signHere: 'signHereTabs',
    initialHere: 'initialHereTabs',
    dateSigned: 'dateSignedTabs',
    fullName: 'fullNameTabs',
    email: 'emailTabs',
  };
  return mapping[type] || 'signHereTabs';
}

// Convert percentage positions to DocuSign coordinate system
// DocuSign uses 72 DPI. Standard US Letter = 612x792 points.
function percentToDocuSignCoords(xPercent: number, yPercent: number, pageWidth = 612, pageHeight = 792) {
  return {
    xPosition: String(Math.round((xPercent / 100) * pageWidth)),
    yPosition: String(Math.round((yPercent / 100) * pageHeight)),
  };
}

// ===== Action handlers =====

async function handleFetchEnvelopes(ctx: any) {
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 90);
  const envelopesData = await docuSignFetch(ctx.accessToken, ctx.baseUri,
    `/accounts/${ctx.accountId}/envelopes?from_date=${fromDate.toISOString()}&count=50&order_by=last_modified&order=desc`
  );
  const envelopes = (envelopesData.envelopes || []).map((e: any) => ({
    envelopeId: e.envelopeId, subject: e.emailSubject || 'Untitled', status: e.status,
    statusChangedDateTime: e.statusChangedDateTime, sentDateTime: e.sentDateTime,
    completedDateTime: e.completedDateTime, createdDateTime: e.createdDateTime,
  }));
  console.log(`[sync-docusign] Fetched ${envelopes.length} envelopes for user ${ctx.user.id}`);
  return { envelopes };
}

async function handleFetchEnvelopeDetails(ctx: any, body: any) {
  const envelopeId = body.envelopeId;
  if (!envelopeId) throw { status: 400, message: 'envelopeId required' };

  const [envelopeDetail, recipients] = await Promise.all([
    docuSignFetch(ctx.accessToken, ctx.baseUri, `/accounts/${ctx.accountId}/envelopes/${envelopeId}`),
    docuSignFetch(ctx.accessToken, ctx.baseUri, `/accounts/${ctx.accountId}/envelopes/${envelopeId}/recipients`),
  ]);

  return {
    envelope: {
      envelopeId: envelopeDetail.envelopeId, subject: envelopeDetail.emailSubject || 'Untitled',
      status: envelopeDetail.status, sentDateTime: envelopeDetail.sentDateTime,
      completedDateTime: envelopeDetail.completedDateTime,
      signers: (recipients.signers || []).map((s: any) => ({ name: s.name, email: s.email, status: s.status, signedDateTime: s.signedDateTime })),
    },
  };
}

async function handleSendEnvelope(ctx: any, body: any) {
  const { recipients, documents, emailSubject, emailBlurb, taskId, buyerId, listingId, enableReminders, enableExpiration, customTabs } = body;
  const documentBase64 = body.documentBase64;
  const documentName = body.documentName;

  if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
    throw { status: 400, message: 'At least one recipient is required' };
  }

  // Build documents array
  let envelopeDocuments: any[];
  let primaryDocumentName: string;

  if (documents && Array.isArray(documents) && documents.length > 0) {
    envelopeDocuments = documents.map((doc: any, idx: number) => ({
      documentBase64: doc.documentBase64, name: doc.documentName,
      fileExtension: doc.documentName.split('.').pop() || 'pdf', documentId: doc.documentId || String(idx + 1),
    }));
    primaryDocumentName = documents[0].documentName;
  } else if (documentBase64 && documentName) {
    envelopeDocuments = [{ documentBase64, name: documentName, fileExtension: documentName.split('.').pop() || 'pdf', documentId: '1' }];
    primaryDocumentName = documentName;
  } else {
    throw { status: 400, message: 'At least one document is required' };
  }

  // Build signers with tabs
  const signers = recipients.map((r: any, idx: number) => {
    const recipientId = String(idx + 1);
    let tabs: any = {};

    if (customTabs && Array.isArray(customTabs) && customTabs.length > 0) {
      // Use custom tab positions from the tag placement UI
      const recipientCustomTabs = customTabs.filter((t: any) => t.recipientIndex === idx);
      for (const tab of recipientCustomTabs) {
        const tabArrayKey = mapTabType(tab.type);
        if (!tabs[tabArrayKey]) tabs[tabArrayKey] = [];
        const coords = percentToDocuSignCoords(tab.xPercent, tab.yPercent);
        tabs[tabArrayKey].push({
          documentId: tab.documentId,
          pageNumber: tab.pageNumber,
          ...coords,
        });
      }
      // Ensure at least one signHere tab for this recipient
      if (!tabs.signHereTabs || tabs.signHereTabs.length === 0) {
        tabs.signHereTabs = envelopeDocuments.map((doc: any) => ({
          documentId: doc.documentId, pageNumber: '1', xPosition: '100', yPosition: '700',
        }));
      }
    } else {
      // Default: signHere at bottom of page 1 of each document
      tabs = {
        signHereTabs: envelopeDocuments.map((doc: any) => ({
          documentId: doc.documentId, pageNumber: '1', xPosition: '100', yPosition: '700',
        })),
      };
    }

    return {
      email: r.email, name: r.name, recipientId, routingOrder: recipientId,
      // Set clientUserId for embedded signing support
      clientUserId: `clozze-${ctx.user.id}-${idx}`,
      tabs,
    };
  });

  // Build envelope definition
  const envelopeDefinition: any = {
    emailSubject: emailSubject || `Please sign: ${primaryDocumentName}`,
    emailBlurb: emailBlurb || 'Please review and sign the attached document.',
    documents: envelopeDocuments, recipients: { signers }, status: 'sent',
  };

  // Notification settings
  const notification: any = { useAccountDefaults: 'false' };
  if (enableReminders !== false) {
    notification.reminders = { reminderEnabled: 'true', reminderDelay: '3', reminderFrequency: '5' };
  }
  if (enableExpiration !== false) {
    notification.expirations = { expireEnabled: 'true', expireAfter: '30', expireWarn: '3' };
  }
  envelopeDefinition.notification = notification;

  console.log(`[sync-docusign] Sending envelope "${emailSubject || primaryDocumentName}" with ${envelopeDocuments.length} doc(s) to ${recipients.length} recipients (custom tabs: ${customTabs ? customTabs.length : 0})`);

  const result = await docuSignFetch(ctx.accessToken, ctx.baseUri,
    `/accounts/${ctx.accountId}/envelopes`, { method: 'POST', body: JSON.stringify(envelopeDefinition) }
  );

  console.log(`[sync-docusign] Envelope created: ${result.envelopeId}, status: ${result.status}`);

  // Store in tracking table
  await ctx.supabaseAdmin.from('docusign_envelopes').insert({
    user_id: ctx.user.id, envelope_id: result.envelopeId,
    subject: emailSubject || `Please sign: ${primaryDocumentName}`,
    status: result.status || 'sent', task_id: taskId || null, buyer_id: buyerId || null,
    listing_id: listingId || null, recipients: recipients,
    document_name: envelopeDocuments.map((d: any) => d.name).join(', '),
    sent_at: new Date().toISOString(),
  });

  return {
    envelopeId: result.envelopeId, status: result.status,
    statusDateTime: result.statusDateTime, uri: result.uri,
  };
}

async function handleCheckStatus(ctx: any, body: any) {
  const envelopeId = body.envelopeId;
  if (!envelopeId) throw { status: 400, message: 'envelopeId required' };

  const [envelopeDetail, recipients] = await Promise.all([
    docuSignFetch(ctx.accessToken, ctx.baseUri, `/accounts/${ctx.accountId}/envelopes/${envelopeId}`),
    docuSignFetch(ctx.accessToken, ctx.baseUri, `/accounts/${ctx.accountId}/envelopes/${envelopeId}/recipients`),
  ]);

  const status = envelopeDetail.status;
  const updateData: any = { status };
  if (status === 'completed') updateData.completed_at = envelopeDetail.completedDateTime;
  if (status === 'voided') updateData.voided_at = envelopeDetail.voidedDateTime;

  await ctx.supabaseAdmin.from('docusign_envelopes').update(updateData)
    .eq('user_id', ctx.user.id).eq('envelope_id', envelopeId);

  return {
    envelopeId, status, sentDateTime: envelopeDetail.sentDateTime,
    completedDateTime: envelopeDetail.completedDateTime, voidedDateTime: envelopeDetail.voidedDateTime,
    signers: (recipients.signers || []).map((s: any) => ({ name: s.name, email: s.email, status: s.status, signedDateTime: s.signedDateTime })),
  };
}

async function handleDownloadDocument(ctx: any, body: any) {
  const envelopeId = body.envelopeId;
  if (!envelopeId) throw { status: 400, message: 'envelopeId required' };

  const pdfBuffer = await docuSignFetchBinary(ctx.accessToken, ctx.baseUri,
    `/accounts/${ctx.accountId}/envelopes/${envelopeId}/documents/combined`
  );

  const bytes = new Uint8Array(pdfBuffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const documentBase64 = btoa(binary);

  console.log(`[sync-docusign] Downloaded combined PDF for envelope ${envelopeId} (${bytes.length} bytes)`);
  return { documentBase64 };
}

async function handleCreateRecipientView(ctx: any, body: any) {
  const { envelopeId, recipientEmail, recipientName, returnUrl } = body;
  if (!envelopeId || !recipientEmail || !recipientName) {
    throw { status: 400, message: 'envelopeId, recipientEmail, and recipientName are required' };
  }

  // Get the recipients to find the matching signer with clientUserId
  const recipientsData = await docuSignFetch(ctx.accessToken, ctx.baseUri,
    `/accounts/${ctx.accountId}/envelopes/${envelopeId}/recipients`
  );

  const signer = (recipientsData.signers || []).find(
    (s: any) => s.email.toLowerCase() === recipientEmail.toLowerCase()
  );

  if (!signer) {
    throw { status: 404, message: `Recipient ${recipientEmail} not found in envelope` };
  }

  if (!signer.clientUserId) {
    throw { status: 400, message: 'This envelope was not created for embedded signing. Recipients sign via email.' };
  }

  const viewRequest = {
    returnUrl: returnUrl || 'https://app.clozze.io',
    authenticationMethod: 'none',
    email: signer.email,
    userName: signer.name,
    clientUserId: signer.clientUserId,
  };

  const result = await docuSignFetch(ctx.accessToken, ctx.baseUri,
    `/accounts/${ctx.accountId}/envelopes/${envelopeId}/views/recipient`,
    { method: 'POST', body: JSON.stringify(viewRequest) }
  );

  console.log(`[sync-docusign] Created recipient view for ${recipientEmail} in envelope ${envelopeId}`);
  return { url: result.url };
}

// ===== Main handler =====

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ctx = await getAuthenticatedContext(req).catch((e) => {
      if (e.message === 'UNAUTHORIZED') throw { status: 401, message: 'Missing or invalid authorization' };
      throw { status: 400, message: e.message };
    });

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'fetch_envelopes';
    let responseData: any = {};

    switch (action) {
      case 'fetch_envelopes':
        responseData = await handleFetchEnvelopes(ctx);
        break;
      case 'fetch_envelope_details':
        responseData = await handleFetchEnvelopeDetails(ctx, body);
        break;
      case 'send_envelope':
        responseData = await handleSendEnvelope(ctx, body);
        break;
      case 'check_status':
        responseData = await handleCheckStatus(ctx, body);
        break;
      case 'download_document':
        responseData = await handleDownloadDocument(ctx, body);
        break;
      case 'create_recipient_view':
        responseData = await handleCreateRecipientView(ctx, body);
        break;
      default:
        throw { status: 400, message: `Unknown action: ${action}` };
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
