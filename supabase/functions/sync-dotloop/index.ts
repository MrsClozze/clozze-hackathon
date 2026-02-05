import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const DOTLOOP_API_BASE = 'https://api-gateway.dotloop.com/public/v2';

interface DotloopTokens {
  access_token: string;
  refresh_token: string;
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

    const { action } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get Dotloop tokens
    const tokens = await getValidAccessToken(supabaseAdmin, user.id);
    if (!tokens) {
      return new Response(
        JSON.stringify({ error: 'Dotloop not connected' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result;

    switch (action) {
      case 'get_account':
        result = await getAccount(tokens.access_token);
        break;
      
      case 'get_profiles':
        result = await getProfiles(tokens.access_token);
        break;
      
      case 'get_loops':
        const { profileId, status } = await req.json();
        result = await getLoops(tokens.access_token, profileId, status);
        break;

      case 'get_contacts':
        // Contacts are now fetched per-loop as participants, use sync_all instead
        result = { data: [], message: 'Use sync_all to get contacts from loops' };
        break;

      case 'sync_all':
        result = await syncAll(supabaseAdmin, user.id, tokens.access_token);
        break;

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[sync-dotloop] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function getValidAccessToken(supabase: any, userId: string): Promise<DotloopTokens | null> {
  const { data: integration, error } = await supabase
    .from('service_integrations')
    .select('access_token_encrypted, refresh_token_encrypted, token_expires_at')
    .eq('user_id', userId)
    .eq('service_name', 'dotloop')
    .eq('is_connected', true)
    .maybeSingle();

  if (error || !integration) {
    console.error('[sync-dotloop] No Dotloop integration found:', error);
    return null;
  }

  const now = new Date();
  const expiresAt = new Date(integration.token_expires_at);

  // If token is expired or about to expire (within 5 minutes), refresh it
  if (expiresAt <= new Date(now.getTime() + 5 * 60 * 1000)) {
    console.log('[sync-dotloop] Token expired, refreshing...');
    return await refreshAccessToken(supabase, userId, integration.refresh_token_encrypted);
  }

  return {
    access_token: integration.access_token_encrypted,
    refresh_token: integration.refresh_token_encrypted,
  };
}

async function refreshAccessToken(supabase: any, userId: string, refreshToken: string): Promise<DotloopTokens | null> {
  const DOTLOOP_CLIENT_ID = Deno.env.get('DOTLOOP_CLIENT_ID');
  const DOTLOOP_CLIENT_SECRET = Deno.env.get('DOTLOOP_CLIENT_SECRET');

  if (!DOTLOOP_CLIENT_ID || !DOTLOOP_CLIENT_SECRET) {
    console.error('[sync-dotloop] Missing Dotloop credentials');
    return null;
  }

  const basicAuth = btoa(`${DOTLOOP_CLIENT_ID}:${DOTLOOP_CLIENT_SECRET}`);

  try {
    const response = await fetch(
      `https://auth.dotloop.com/oauth/token?grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    if (!response.ok) {
      console.error('[sync-dotloop] Token refresh failed:', response.status);
      // Mark integration as disconnected
      await supabase
        .from('service_integrations')
        .update({ is_connected: false })
        .eq('user_id', userId)
        .eq('service_name', 'dotloop');
      return null;
    }

    const tokens = await response.json();
    const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000)).toISOString();

    // Update tokens in database
    await supabase
      .from('service_integrations')
      .update({
        access_token_encrypted: tokens.access_token,
        refresh_token_encrypted: tokens.refresh_token,
        token_expires_at: expiresAt,
      })
      .eq('user_id', userId)
      .eq('service_name', 'dotloop');

    console.log('[sync-dotloop] Token refreshed successfully');

    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    };
  } catch (error) {
    console.error('[sync-dotloop] Token refresh error:', error);
    return null;
  }
}

async function dotloopFetch(accessToken: string, endpoint: string): Promise<any> {
  const response = await fetch(`${DOTLOOP_API_BASE}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Dotloop API error: ${response.status} - ${error}`);
  }

  return response.json();
}

async function getAccount(accessToken: string) {
  return await dotloopFetch(accessToken, '/account');
}

async function getProfiles(accessToken: string) {
  return await dotloopFetch(accessToken, '/profile');
}

async function getLoops(accessToken: string, profileId?: number, status?: string) {
  // Dotloop API requires profile ID in the path to get loops for that profile
  if (!profileId) {
    console.log('[sync-dotloop] No profile ID provided for getLoops');
    return { data: [] };
  }
  
  let endpoint = `/profile/${profileId}/loop`;
  const params = new URLSearchParams();
  
  if (status) params.set('status', status);
  
  if (params.toString()) {
    endpoint += `?${params.toString()}`;
  }

  console.log('[sync-dotloop] Fetching loops from endpoint:', endpoint);
  return await dotloopFetch(accessToken, endpoint);
}

async function getLoopParticipants(accessToken: string, profileId: number, loopId: number) {
  // Get participants (contacts) from a specific loop
  const endpoint = `/profile/${profileId}/loop/${loopId}/participant`;
  console.log('[sync-dotloop] Fetching participants from endpoint:', endpoint);
  return await dotloopFetch(accessToken, endpoint);
}

async function syncAll(supabase: any, userId: string, accessToken: string) {
  const results = {
    account: null as any,
    profiles: [] as any[],
    loops: [] as any[],
    contacts: [] as any[],
    errors: [] as string[],
  };

  try {
    // Get account info
    results.account = await getAccount(accessToken);
    console.log('[sync-dotloop] Fetched account info');
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    results.errors.push(`Account fetch failed: ${msg}`);
  }

  try {
    // Get all profiles
    const profilesResponse = await getProfiles(accessToken);
    results.profiles = profilesResponse.data || [];
    console.log('[sync-dotloop] Fetched', results.profiles.length, 'profiles');
    
    // Log profile details for debugging
    for (const profile of results.profiles) {
      console.log('[sync-dotloop] Profile:', profile.id, '-', profile.name || 'Unnamed');
    }

    // Get loops for each profile
    for (const profile of results.profiles) {
      try {
        const loopsResponse = await getLoops(accessToken, profile.id);
        const loops = loopsResponse.data || [];
        console.log('[sync-dotloop] Profile', profile.id, 'has', loops.length, 'loops');
        results.loops.push(...loops.map((loop: any) => ({ ...loop, profileId: profile.id })));
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error('[sync-dotloop] Loops fetch error for profile', profile.id, ':', msg);
        results.errors.push(`Loops fetch failed for profile ${profile.id}: ${msg}`);
      }
    }
    console.log('[sync-dotloop] Fetched', results.loops.length, 'total loops');
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    results.errors.push(`Profiles fetch failed: ${msg}`);
  }

  try {
    // Get participants (contacts) from each loop
    for (const loop of results.loops) {
      try {
        const participantsResponse = await getLoopParticipants(accessToken, loop.profileId, loop.id);
        const participants = participantsResponse.data || [];
        console.log('[sync-dotloop] Loop', loop.id, 'has', participants.length, 'participants');
        
        // Map participants to contact format, avoiding duplicates by email
        for (const participant of participants) {
          const email = participant.email?.toLowerCase();
          const existingContact = results.contacts.find(
            (c: any) => c.email?.toLowerCase() === email && email
          );
          
          if (!existingContact) {
            results.contacts.push({
              id: participant.id,
              firstName: participant.firstName || '',
              lastName: participant.lastName || '',
              email: participant.email || '',
              phone: participant.phone || participant.cellPhone || '',
              role: participant.role || '',
              loopId: loop.id,
              profileId: loop.profileId,
            });
          }
        }
      } catch (err) {
        // Participants endpoint might 404 for empty loops - this is okay
        const msg = err instanceof Error ? err.message : 'Unknown error';
        if (!msg.includes('404')) {
          console.error('[sync-dotloop] Participants fetch error for loop', loop.id, ':', msg);
          results.errors.push(`Participants fetch failed for loop ${loop.id}: ${msg}`);
        }
      }
    }
    console.log('[sync-dotloop] Fetched', results.contacts.length, 'total contacts');
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    results.errors.push(`Participants iteration failed: ${msg}`);
  }

  // Update last sync timestamp
  await supabase
    .from('service_integrations')
    .update({ updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('service_name', 'dotloop');

  return {
    success: true,
    summary: {
      accountName: results.account?.data?.name || 'Unknown',
      profileCount: results.profiles.length,
      loopCount: results.loops.length,
      contactCount: results.contacts.length,
    },
    data: results,
    errors: results.errors,
  };
}
