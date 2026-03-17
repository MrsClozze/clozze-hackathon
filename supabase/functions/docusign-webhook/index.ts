import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // DocuSign Connect sends XML or JSON payloads
    const contentType = req.headers.get('content-type') || '';
    let envelopeId = '';
    let envelopeStatus = '';
    let recipientStatuses: any[] = [];

    if (contentType.includes('application/json')) {
      const body = await req.json();
      console.log('[docusign-webhook] Received JSON webhook:', JSON.stringify(body).substring(0, 500));

      // DocuSign Connect JSON format
      envelopeId = body.envelopeId || body.data?.envelopeId || '';
      envelopeStatus = body.status || body.data?.envelopeSummary?.status || '';
      
      if (body.data?.envelopeSummary?.recipients?.signers) {
        recipientStatuses = body.data.envelopeSummary.recipients.signers.map((s: any) => ({
          name: s.name,
          email: s.email,
          status: s.status,
          signedDateTime: s.signedDateTime,
        }));
      }
    } else if (contentType.includes('application/xml') || contentType.includes('text/xml')) {
      const xmlText = await req.text();
      console.log('[docusign-webhook] Received XML webhook:', xmlText.substring(0, 500));

      // Parse key fields from XML using regex (lightweight, no XML parser needed)
      const envelopeIdMatch = xmlText.match(/<EnvelopeID>([^<]+)<\/EnvelopeID>/i);
      const statusMatch = xmlText.match(/<Status>([^<]+)<\/Status>/i);
      
      envelopeId = envelopeIdMatch?.[1] || '';
      envelopeStatus = statusMatch?.[1]?.toLowerCase() || '';
    } else {
      // Try JSON as fallback
      try {
        const body = await req.json();
        envelopeId = body.envelopeId || '';
        envelopeStatus = body.status || '';
      } catch {
        console.error('[docusign-webhook] Unsupported content type:', contentType);
        return new Response('Unsupported content type', { status: 400 });
      }
    }

    if (!envelopeId) {
      console.warn('[docusign-webhook] No envelope ID in webhook payload');
      return new Response(JSON.stringify({ received: true, warning: 'No envelope ID' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[docusign-webhook] Processing envelope ${envelopeId}, status: ${envelopeStatus}`);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Update the envelope status in our tracking table
    const updateData: any = {
      status: envelopeStatus,
    };

    if (envelopeStatus === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }
    if (envelopeStatus === 'voided') {
      updateData.voided_at = new Date().toISOString();
    }
    if (recipientStatuses.length > 0) {
      updateData.recipients = recipientStatuses;
    }

    const { data, error } = await supabaseAdmin
      .from('docusign_envelopes')
      .update(updateData)
      .eq('envelope_id', envelopeId);

    if (error) {
      console.error('[docusign-webhook] Error updating envelope:', error);
    } else {
      console.log(`[docusign-webhook] Updated envelope ${envelopeId} to status: ${envelopeStatus}`);
    }

    return new Response(
      JSON.stringify({ received: true, envelopeId, status: envelopeStatus }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[docusign-webhook] Error:', error);
    // Always return 200 to DocuSign to prevent retries
    return new Response(
      JSON.stringify({ received: true, error: 'Processing error' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
