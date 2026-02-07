import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const FUB_API_BASE = 'https://api.followupboss.com/v1';

async function fubFetch(token: string, isOAuth: boolean, endpoint: string, params?: Record<string, string>) {
  const url = new URL(`${FUB_API_BASE}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };

  if (isOAuth) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    headers['Authorization'] = `Basic ${btoa(token + ':')}`;
    const FUB_X_SYSTEM = Deno.env.get('FUB_X_SYSTEM');
    const FUB_X_SYSTEM_KEY = Deno.env.get('FUB_X_SYSTEM_KEY');
    if (FUB_X_SYSTEM) headers['X-System'] = FUB_X_SYSTEM;
    if (FUB_X_SYSTEM_KEY) headers['X-System-Key'] = FUB_X_SYSTEM_KEY;
  }

  const response = await fetch(url.toString(), { headers });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[sync-fub] API error ${response.status} for ${endpoint}:`, errorText);
    if (response.status === 401) {
      throw new Error('Invalid Follow Up Boss credentials. Please reconnect.');
    }
    throw new Error(`FUB API error ${response.status}: ${errorText}`);
  }

  return response.json();
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

    // Get FUB credentials from service_integrations
    const { data: integration, error: intError } = await supabaseAdmin
      .from('service_integrations')
      .select('access_token_encrypted, refresh_token_encrypted')
      .eq('user_id', user.id)
      .eq('service_name', 'follow_up_boss')
      .eq('is_connected', true)
      .maybeSingle();

    if (intError || !integration?.access_token_encrypted) {
      return new Response(
        JSON.stringify({ error: 'Follow Up Boss not connected. Please add your API key in Integrations.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = integration.access_token_encrypted;
    const refreshToken = integration.refresh_token_encrypted;
    // Determine auth mode: if refresh_token exists, it's OAuth (Bearer); otherwise API key (Basic)
    const isOAuth = !!refreshToken;

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'fetch_people';

    let responseData: any = {};

    if (action === 'fetch_people' || action === 'sync_all') {
      const peopleResponse = await fubFetch(accessToken, isOAuth, '/people', {
        limit: '100',
        fields: 'id,firstName,lastName,emails,phones,tags,stage,created,addresses',
      });

      const people = (peopleResponse.people || []).map((p: any) => ({
        id: p.id,
        firstName: p.firstName || '',
        lastName: p.lastName || '',
        email: p.emails?.[0]?.value || '',
        phone: p.phones?.[0]?.value || '',
        tags: p.tags || [],
        stage: p.stage || '',
        address: p.addresses?.[0] ?
          `${p.addresses[0].street || ''} ${p.addresses[0].city || ''} ${p.addresses[0].state || ''} ${p.addresses[0].zip || ''}`.trim() : '',
      }));

      responseData.people = people;
      console.log(`[sync-fub] Fetched ${people.length} people for user ${user.id}`);
    }

    if (action === 'fetch_deals' || action === 'sync_all') {
      try {
        const dealsResponse = await fubFetch(accessToken, isOAuth, '/deals', { limit: '100' });

        const deals = (dealsResponse.deals || []).map((d: any) => ({
          id: d.id,
          name: d.name || '',
          stage: d.stage || '',
          price: d.price || 0,
          address: d.propertyAddress || '',
          city: d.propertyCity || '',
          state: d.propertyState || '',
          zip: d.propertyZip || '',
          type: d.dealType || '',
        }));

        responseData.deals = deals;
        console.log(`[sync-fub] Fetched ${deals.length} deals for user ${user.id}`);
      } catch (dealErr) {
        console.warn('[sync-fub] Could not fetch deals:', dealErr);
        responseData.deals = [];
        responseData.dealsNote = 'Deals endpoint not available.';
      }
    }

    return new Response(
      JSON.stringify({ success: true, data: responseData }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[sync-fub] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
