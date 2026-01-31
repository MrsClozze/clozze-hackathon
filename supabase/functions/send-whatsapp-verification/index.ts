import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Strict E.164 phone number validation
const isValidPhoneNumber = (phone: unknown): phone is string => {
  if (typeof phone !== 'string') return false;
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  // Strict E.164: + followed by 1-15 digits, first digit 1-9
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(cleanPhone);
};

// Hash verification code using SHA-256
const hashVerificationCode = async (code: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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

    // Validate phone number format with strict E.164
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
    
    // Hash the verification code before storing
    const hashedCode = await hashVerificationCode(verificationCode);
    
    console.log(`Generated verification code for phone ending in ${normalizedPhone.slice(-4)}, expires at ${expiresAt.toISOString()}`);

    // Store HASHED verification code in database
    const { error: dbError } = await supabaseClient
      .from('whatsapp_integrations')
      .upsert({
        user_id: user.id,
        phone_number: normalizedPhone,
        verification_code: hashedCode,
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
    // For now, return the code only in development for testing purposes
    // In production, this devCode field should be removed
    
    // Log that verification was initiated (without exposing the code)
    console.log(`Verification code generated for phone ending in ${normalizedPhone.slice(-4)}`);

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
