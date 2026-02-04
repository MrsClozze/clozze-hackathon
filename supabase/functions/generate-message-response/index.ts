import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Input validation helpers
const isValidString = (val: unknown, maxLength: number): val is string => 
  typeof val === 'string' && val.trim().length > 0 && val.length <= maxLength;

const VALID_MESSAGE_TYPES = ['email', 'text', 'sms'] as const;
type MessageType = typeof VALID_MESSAGE_TYPES[number];

const isValidMessageType = (val: unknown): val is MessageType => 
  typeof val === 'string' && VALID_MESSAGE_TYPES.includes(val as MessageType);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Validate all required fields
    const { messageType, sender, originalMessage, actionItem } = body;

    if (!isValidMessageType(messageType)) {
      throw new Error(`Invalid messageType: must be one of ${VALID_MESSAGE_TYPES.join(', ')}`);
    }

    if (!isValidString(sender, 200)) {
      throw new Error('Invalid sender: must be a non-empty string with max 200 characters');
    }

    if (!isValidString(originalMessage, 10000)) {
      throw new Error('Invalid originalMessage: must be a non-empty string with max 10000 characters');
    }

    if (!isValidString(actionItem, 1000)) {
      throw new Error('Invalid actionItem: must be a non-empty string with max 1000 characters');
    }
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Get user from auth header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Failed to get user');
    }

    // Fetch user's trained communication style
    const { data: preferences } = await supabase
      .from('agent_communication_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    let styleContext = '';
    if (preferences) {
      // Build context from the user's actual scenario responses
      styleContext = `\n\nIMPORTANT: Draft this response in the agent's personal communication style based on these examples of how they write:

General client communication: ${preferences.general_client_scenario || 'Not provided'}
Good news to buyers: ${preferences.buyer_good_news_scenario || 'Not provided'}
Bad news to buyers: ${preferences.buyer_bad_news_scenario || 'Not provided'}
New listing announcements: ${preferences.listing_new_listing_scenario || 'Not provided'}
Price reduction recommendations: ${preferences.listing_price_reduction_scenario || 'Not provided'}
Lender communications: ${preferences.preferred_lender_scenario || 'Not provided'}
Title company communications: ${preferences.title_company_scenario || 'Not provided'}
Team communications: ${preferences.coworker_team_scenario || 'Not provided'}

Match their tone, word choices, formality level, and communication patterns exactly.`;
      
      // Add booking link if available and relevant
      if (preferences.has_booking_link && preferences.booking_link_url) {
        styleContext += `\n\nIf appropriate for this response, include their booking link: ${preferences.booking_link_url}`;
      }
    }

    const systemPrompt = messageType === 'email' 
      ? `You are a professional real estate agent assistant helping to draft email responses. Be professional, clear, and actionable.${styleContext}`
      : `You are a professional real estate agent assistant helping to draft text message responses. Keep responses concise, friendly, and professional.${styleContext}`;

    const userPrompt = `Original message from ${sender}: "${originalMessage}"

Action item identified: ${actionItem}

Draft a ${messageType === 'email' ? 'professional email' : 'friendly text message'} response that addresses this action item appropriately.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limits exceeded, please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required, please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('AI gateway error');
    }

    const data = await response.json();
    const generatedResponse = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ response: generatedResponse }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating response:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
