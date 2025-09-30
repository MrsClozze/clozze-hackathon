import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const integrationKey = Deno.env.get('DOCUSIGN_INTEGRATION_KEY');
    if (!integrationKey) {
      throw new Error('DocuSign Integration Key not configured');
    }

    const url = new URL(req.url);
    const redirectUri = `${url.origin}/supabase/functions/v1/docusign-callback`;

    // Build DocuSign OAuth authorization URL
    const authUrl = new URL('https://account-d.docusign.com/oauth/auth');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'signature impersonation');
    authUrl.searchParams.set('client_id', integrationKey);
    authUrl.searchParams.set('redirect_uri', redirectUri);

    return new Response(
      JSON.stringify({ authUrl: authUrl.toString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating DocuSign auth URL:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
