import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { scenarios } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Create a training prompt from the user's responses
    const trainingPrompt = `
You are learning a user's communication style. Below are several scenarios and how they responded.
Analyze their tone, formality level, word choice, and style patterns.

${scenarios.map((s: { scenario: string; response: string }, i: number) => `
Scenario ${i + 1}: ${s.scenario}
User's Response: ${s.response}
`).join('\n')}

Create a concise style guide (max 200 words) that captures this user's communication patterns for future message drafting.
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
          { role: "system", content: "You are an AI communication style analyzer." },
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
