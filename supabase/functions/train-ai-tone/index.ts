import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation helpers
const isValidString = (val: unknown, maxLength = 2000): val is string => 
  typeof val === 'string' && val.length <= maxLength;

const isValidUrl = (val: unknown): boolean => {
  if (typeof val !== 'string' || val === 'no') return true; // 'no' is valid
  if (val.length > 500) return false;
  try {
    new URL(val);
    return true;
  } catch {
    return false;
  }
};

const isValidEmail = (val: unknown): boolean => {
  if (typeof val !== 'string' || val === 'no') return true; // 'no' is valid
  if (val.length > 254) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(val);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const responses = body?.responses;

    // Validate responses object exists
    if (!responses || typeof responses !== 'object') {
      throw new Error("Invalid request: 'responses' object is required");
    }

    // Validate all scenario fields (q1-q8)
    const scenarioFields = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8'];
    for (const field of scenarioFields) {
      if (!isValidString(responses[field], 5000)) {
        throw new Error(`Invalid ${field}: must be a string with max 5000 characters`);
      }
    }

    // Validate optional booking link (q9)
    if (responses.q9 !== undefined && !isValidUrl(responses.q9)) {
      throw new Error("Invalid booking link URL format");
    }

    // Validate optional email (q10)
    if (responses.q10 !== undefined && !isValidEmail(responses.q10)) {
      throw new Error("Invalid email format");
    }

    const AI_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!AI_API_KEY) {
      throw new Error("AI_API_KEY is not configured");
    }

    // Get user from auth header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Failed to get user");
    }

    // Create a training prompt from the user's responses to actual scenarios
    const trainingPrompt = `
You are learning a real estate agent's communication style by analyzing their actual written responses to various professional scenarios.

Scenario 1 (General Client - Next Steps): ${responses.q1}
Scenario 2 (Buyer - Good News): ${responses.q2}
Scenario 3 (Buyer - Bad News): ${responses.q3}
Scenario 4 (New Listing Announcement): ${responses.q4}
Scenario 5 (Price Reduction Recommendation): ${responses.q5}
Scenario 6 (Preferred Lender Communication): ${responses.q6}
Scenario 7 (Title Company Communication): ${responses.q7}
Scenario 8 (Co-worker/Team Communication): ${responses.q8}

Analyze these actual written examples and create a concise style guide (max 200 words) that captures this agent's unique communication patterns, tone, word choices, and approach for drafting messages to different stakeholders.
`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an AI communication style analyzer for real estate professionals." },
          { role: "user", content: trainingPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to train AI tone");
    }

    const data = await response.json();
    const styleGuide = data.choices[0].message.content;

    console.log("AI Tone Training Complete:", styleGuide);

    // Parse booking link and email from responses (now q9 and q10)
    const bookingLink = responses.q9 !== "no" ? responses.q9 : null;
    const preferredEmail = responses.q10 !== "no" ? responses.q10 : null;

    // Save to database with scenario-based responses
    const { error: dbError } = await supabase
      .from('agent_communication_preferences')
      .upsert({
        user_id: user.id,
        onboarding_completed: true,
        general_client_scenario: responses.q1,
        buyer_good_news_scenario: responses.q2,
        buyer_bad_news_scenario: responses.q3,
        listing_new_listing_scenario: responses.q4,
        listing_price_reduction_scenario: responses.q5,
        preferred_lender_scenario: responses.q6,
        title_company_scenario: responses.q7,
        coworker_team_scenario: responses.q8,
        has_booking_link: !!bookingLink,
        booking_link_url: bookingLink,
        has_preferred_email: !!preferredEmail,
        preferred_email: preferredEmail,
      }, {
        onConflict: 'user_id'
      });

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error("Failed to save preferences");
    }

    return new Response(
      JSON.stringify({ success: true, styleGuide }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in train-ai-tone:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
