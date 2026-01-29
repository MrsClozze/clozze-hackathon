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

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const redirectUri = `${supabaseUrl}/functions/v1/docusign-callback`;

    // Get the origin from the request to pass through state for secure postMessage
    const requestOrigin = req.headers.get('origin') || req.headers.get('referer');
    let allowedOrigin = supabaseUrl; // Default fallback
    
    if (requestOrigin) {
      try {
        allowedOrigin = new URL(requestOrigin).origin;
      } catch {
        // Keep default if URL parsing fails
      }
    }

    // Encode the allowed origin in the state parameter for secure callback
    const state = btoa(JSON.stringify({ origin: allowedOrigin }));

    // Build DocuSign OAuth authorization URL
    const authUrl = new URL('https://account-d.docusign.com/oauth/auth');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'signature impersonation');
    authUrl.searchParams.set('client_id', integrationKey);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', state);

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
