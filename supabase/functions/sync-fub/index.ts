import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const FUB_API_BASE = 'https://api.followupboss.com/v1';

async function fubFetch(accessToken: string, endpoint: string, params?: Record<string, string>) {
  const url = new URL(`${FUB_API_BASE}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[sync-fub] API error ${response.status} for ${endpoint}:`, errorText);
    throw new Error(`FUB API error ${response.status}: ${errorText}`);
  }

  return response.json();
}

async function refreshTokenIfNeeded(
  supabaseAdmin: any,
  userId: string,
  integration: any
): Promise<string> {
  // Check if token is expired or expiring soon (within 5 minutes)
  const now = Date.now();
  const expiresAt = integration.token_expires_at ? new Date(integration.token_expires_at).getTime() : 0;

  if (expiresAt > now + 5 * 60 * 1000) {
    return integration.access_token_encrypted;
  }

  if (!integration.refresh_token_encrypted) {
    throw new Error('Token expired and no refresh token available. Please reconnect Follow Up Boss.');
  }

  const FUB_CLIENT_ID = Deno.env.get('FUB_CLIENT_ID');
  const FUB_CLIENT_SECRET = Deno.env.get('FUB_CLIENT_SECRET');

  if (!FUB_CLIENT_ID || !FUB_CLIENT_SECRET) {
    throw new Error('FUB credentials not configured');
  }

  console.log('[sync-fub] Refreshing expired token for user:', userId);

  const tokenResponse = await fetch(`${FUB_API_BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: FUB_CLIENT_ID,
      client_secret: FUB_CLIENT_SECRET,
      refresh_token: integration.refresh_token_encrypted,
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error('[sync-fub] Token refresh failed:', errorText);
    throw new Error('Failed to refresh token. Please reconnect Follow Up Boss.');
  }

  const tokens = await tokenResponse.json();
  const expiresIn = tokens.expires_in || 86400;
  const newExpiresAt = new Date(Date.now() + (expiresIn * 1000)).toISOString();

  await supabaseAdmin
    .from('service_integrations')
    .update({
      access_token_encrypted: tokens.access_token,
      refresh_token_encrypted: tokens.refresh_token || integration.refresh_token_encrypted,
      token_expires_at: newExpiresAt,
    })
    .eq('user_id', userId)
    .eq('service_name', 'follow_up_boss');

  return tokens.access_token;
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

    // Get FUB integration tokens
    const { data: integration, error: intError } = await supabaseAdmin
      .from('service_integrations')
      .select('access_token_encrypted, refresh_token_encrypted, token_expires_at')
      .eq('user_id', user.id)
      .eq('service_name', 'follow_up_boss')
      .eq('is_connected', true)
      .maybeSingle();

    if (intError || !integration) {
      return new Response(
        JSON.stringify({ error: 'Follow Up Boss not connected' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Refresh token if needed
    const accessToken = await refreshTokenIfNeeded(supabaseAdmin, user.id, integration);

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'fetch_people';

    let responseData: any = {};

    if (action === 'fetch_people' || action === 'sync_all') {
      // Fetch people (contacts) from FUB
      // Use tags to identify buyers vs sellers
      const peopleResponse = await fubFetch(accessToken, '/people', {
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
      // Fetch deals from FUB
      try {
        const dealsResponse = await fubFetch(accessToken, '/deals', {
          limit: '100',
        });

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
          people: d.people || [],
        }));

        responseData.deals = deals;
        console.log(`[sync-fub] Fetched ${deals.length} deals for user ${user.id}`);
      } catch (dealErr) {
        // Deals endpoint may not be available on all plans
        console.warn('[sync-fub] Could not fetch deals:', dealErr);
        responseData.deals = [];
        responseData.dealsNote = 'Deals endpoint not available. People were fetched successfully.';
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
