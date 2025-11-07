import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { code } = await req.json();

    if (!code) {
      throw new Error('Verification code is required');
    }

    // Get the integration record
    const { data: integration, error: fetchError } = await supabaseClient
      .from('whatsapp_integrations')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (fetchError || !integration) {
      throw new Error('No pending verification found');
    }

    // Check if code is expired
    const expiresAt = new Date(integration.verification_code_expires_at);
    if (expiresAt < new Date()) {
      throw new Error('Verification code has expired');
    }

    // Verify the code
    if (integration.verification_code !== code) {
      throw new Error('Invalid verification code');
    }

    // Mark as verified
    const { error: updateError } = await supabaseClient
      .from('whatsapp_integrations')
      .update({
        verified: true,
        verification_code: null,
        verification_code_expires_at: null,
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Update error:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'WhatsApp connected successfully',
        phoneNumber: integration.phone_number
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});