import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendMessageRequest {
  recipientPhone: string;
  message: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get request body
    const { recipientPhone, message }: SendMessageRequest = await req.json();

    if (!recipientPhone || !message) {
      throw new Error('recipientPhone and message are required');
    }

    // Get user's WhatsApp Business connection
    const { data: connection, error: connError } = await supabaseAdmin
      .from('whatsapp_business_connections')
      .select('phone_number_id, access_token_encrypted, business_phone_number')
      .eq('user_id', user.id)
      .eq('is_connected', true)
      .single();

    if (connError || !connection) {
      throw new Error('WhatsApp Business not connected. Please connect your account first.');
    }

    // Format phone number (remove + and any spaces)
    const formattedPhone = recipientPhone.replace(/[\s+\-()]/g, '');

    // Send message via Meta WhatsApp Cloud API
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${connection.phone_number_id}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${connection.access_token_encrypted}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedPhone,
          type: 'text',
          text: { body: message },
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error('WhatsApp API error:', result);
      throw new Error(result.error?.message || 'Failed to send message');
    }

    // Save outbound message to synced_messages
    const messageId = result.messages?.[0]?.id;
    if (messageId) {
      await supabaseAdmin
        .from('synced_messages')
        .insert({
          user_id: user.id,
          external_message_id: messageId,
          source: 'whatsapp',
          direction: 'outbound',
          sender_phone: connection.business_phone_number || connection.phone_number_id,
          recipient_phone: formattedPhone,
          message_body: message,
          received_at: new Date().toISOString(),
          ai_analyzed: true, // No need to analyze outbound
          ai_ignored: true,
        });
    }

    return new Response(
      JSON.stringify({ success: true, messageId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Send message error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
