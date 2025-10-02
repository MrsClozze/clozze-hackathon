import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { responses } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
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

    // Create a training prompt from the user's responses
    const trainingPrompt = `
You are learning a real estate agent's communication style. Below are their responses to various questions about how they communicate with different stakeholders.

Question 1 (General Clients): ${responses.q1}
Question 2 (Listing Clients): ${responses.q2}
Question 3 (Buyer Clients): ${responses.q3}
Question 4 (Preferred Lenders): ${responses.q4}
Question 5 (Title Companies): ${responses.q5}
Question 6 (Insurance Agents): ${responses.q6}
Question 7 (Co-workers/Team): ${responses.q7}
Question 10 (General Tone/Frequency): ${responses.q10}

Create a concise style guide (max 200 words) that captures this agent's communication patterns for drafting messages to different stakeholders.
`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
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

    // Parse booking link and email from responses
    const bookingLink = responses.q8 !== "no" ? responses.q8 : null;
    const preferredEmail = responses.q9 !== "no" ? responses.q9 : null;

    // Save to database
    const { error: dbError } = await supabase
      .from('agent_communication_preferences')
      .upsert({
        user_id: user.id,
        onboarding_completed: true,
        general_clients_style: responses.q1,
        listing_clients_style: responses.q2,
        buyer_clients_style: responses.q3,
        lenders_style: responses.q4,
        title_companies_style: responses.q5,
        insurance_agents_style: responses.q6,
        coworkers_style: responses.q7,
        general_tone_frequency: responses.q10,
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
