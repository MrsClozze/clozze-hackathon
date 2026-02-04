import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const url = new URL(req.url);
    
    // GET request = Meta webhook verification
    if (req.method === 'GET') {
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');

      console.log('Webhook verification request:', { mode, token: token?.substring(0, 8) + '...' });

      if (mode === 'subscribe' && token && challenge) {
        // Look up the user by their verify token
        const { data: connection, error } = await supabaseAdmin
          .from('whatsapp_business_connections')
          .select('id, user_id')
          .eq('webhook_verify_token', token)
          .single();

        if (error || !connection) {
          console.error('Invalid verify token:', error);
          return new Response('Forbidden', { status: 403 });
        }

        console.log('Webhook verified for user:', connection.user_id);
        return new Response(challenge, { 
          status: 200,
          headers: { 'Content-Type': 'text/plain' }
        });
      }

      return new Response('Bad Request', { status: 400 });
    }

    // POST request = incoming webhook event
    if (req.method === 'POST') {
      const body = await req.json();
      console.log('Incoming webhook:', JSON.stringify(body, null, 2));

      // Process WhatsApp messages
      if (body.object === 'whatsapp_business_account') {
        for (const entry of body.entry || []) {
          for (const change of entry.changes || []) {
            if (change.field === 'messages') {
              const value = change.value;
              const phoneNumberId = value.metadata?.phone_number_id;

              // Find the user who owns this phone number
              const { data: connection, error: connError } = await supabaseAdmin
                .from('whatsapp_business_connections')
                .select('user_id')
                .eq('phone_number_id', phoneNumberId)
                .eq('is_connected', true)
                .single();

              if (connError || !connection) {
                console.error('No connection found for phone_number_id:', phoneNumberId);
                continue;
              }

              // Process each message
              for (const message of value.messages || []) {
                const externalId = message.id;
                const senderPhone = message.from;
                const messageBody = message.text?.body || message.caption || '[Media message]';
                const timestamp = new Date(parseInt(message.timestamp) * 1000);

                // Get sender contact info if available
                const contact = value.contacts?.find((c: any) => c.wa_id === senderPhone);
                const senderName = contact?.profile?.name || null;

                // Insert message into synced_messages
                const { error: insertError } = await supabaseAdmin
                  .from('synced_messages')
                  .upsert({
                    user_id: connection.user_id,
                    external_message_id: externalId,
                    source: 'whatsapp',
                    direction: 'inbound',
                    sender_phone: senderPhone,
                    sender_name: senderName,
                    recipient_phone: phoneNumberId,
                    message_body: messageBody,
                    received_at: timestamp.toISOString(),
                    ai_analyzed: false,
                    ai_ignored: false,
                  }, {
                    onConflict: 'external_message_id,user_id',
                    ignoreDuplicates: true,
                  });

                if (insertError) {
                  console.error('Error inserting message:', insertError);
                } else {
                  console.log('Message saved:', externalId);
                }
              }
            }
          }
        }
      }

      // Always return 200 to acknowledge receipt
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response('Method not allowed', { status: 405 });

  } catch (error) {
    console.error('Webhook error:', error);
    // Still return 200 to prevent Meta from retrying
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
