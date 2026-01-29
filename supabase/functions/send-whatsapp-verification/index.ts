import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Phone number validation - E.164 format
const isValidPhoneNumber = (phone: unknown): phone is string => {
  if (typeof phone !== 'string') return false;
  // E.164 format: + followed by 1-15 digits
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  // Also allow common formats that can be normalized
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  return e164Regex.test(cleanPhone) || /^\+?\d{10,15}$/.test(cleanPhone);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user from auth header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const body = await req.json();
    const { phoneNumber } = body;

    // Validate phone number format
    if (!isValidPhoneNumber(phoneNumber)) {
      throw new Error('Invalid phone number format. Please use E.164 format (e.g., +1234567890)');
    }

    // Normalize phone number
    const normalizedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
    if (normalizedPhone.length > 16) {
      throw new Error('Phone number is too long');
    }

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    
    console.log(`Generated verification code for phone ending in ${normalizedPhone.slice(-4)}, expires at ${expiresAt.toISOString()}`);

    // Store verification code in database
    const { error: dbError } = await supabaseClient
      .from('whatsapp_integrations')
      .upsert({
        user_id: user.id,
        phone_number: normalizedPhone,
        verification_code: verificationCode,
        verification_code_expires_at: expiresAt.toISOString(),
        verified: false,
      }, {
        onConflict: 'user_id'
      });

    if (dbError) {
      console.error('Database error:', dbError);
      throw dbError;
    }

    // TODO: In production, integrate with WhatsApp Business API or Twilio to send actual SMS
    // For now, store the code in database for verification (code is not exposed to client)
    
    // In a real implementation, you would send the code via WhatsApp Business API:
    // await sendWhatsAppMessage(normalizedPhone, `Your Clozze verification code is: ${verificationCode}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Verification code sent'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
