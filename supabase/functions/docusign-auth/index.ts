import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

    // Verify user is authenticated
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const redirectUri = `${supabaseUrl}/functions/v1/docusign-callback`;

    // Get the origin from the request for secure postMessage
    const requestOrigin = req.headers.get('origin') || req.headers.get('referer');
    let allowedOrigin = supabaseUrl;
    
    if (requestOrigin) {
      try {
        allowedOrigin = new URL(requestOrigin).origin;
      } catch {
        // Keep default if URL parsing fails
      }
    }

    // Encode origin + user_id in state for callback
    const state = btoa(JSON.stringify({ origin: allowedOrigin, userId: user.id }));

    // Production DocuSign URL
    const authUrl = new URL('https://account.docusign.com/oauth/auth');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'signature');
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
