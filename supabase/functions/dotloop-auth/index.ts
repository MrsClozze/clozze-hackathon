import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const DOTLOOP_CLIENT_ID = Deno.env.get('DOTLOOP_CLIENT_ID');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    
    if (!DOTLOOP_CLIENT_ID) {
      throw new Error('DOTLOOP_CLIENT_ID not configured');
    }

    // Get the user from the request
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

    // Generate state parameter to prevent CSRF and store user info
    const state = crypto.randomUUID();
    
    // Store state in a temporary way - we'll use the callback to match it
    // The state will contain the user_id encoded
    const stateData = btoa(JSON.stringify({ 
      userId: user.id, 
      nonce: state,
      origin: req.headers.get('origin') || req.headers.get('referer') || ''
    }));

    // Build the callback URL
    const redirectUri = `${SUPABASE_URL}/functions/v1/dotloop-callback`;

    // Build authorization URL
    const authUrl = new URL('https://auth.dotloop.com/oauth/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', DOTLOOP_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', stateData);
    authUrl.searchParams.set('redirect_on_deny', 'true');

    console.log('[dotloop-auth] Generated auth URL for user:', user.id);

    return new Response(
      JSON.stringify({ 
        authUrl: authUrl.toString(),
        redirectUri 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('[dotloop-auth] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
