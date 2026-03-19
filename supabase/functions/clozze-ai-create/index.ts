import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

type FlowType = 'create_task' | 'add_buyer' | 'add_listing';

const FLOW_SYSTEM_PROMPTS: Record<FlowType, string> = {
  create_task: `You are Clozze AI — an intelligent task operator inside Clozze, a real estate platform.

The user is creating new tasks. You help them structure tasks from natural language.

RULES:
- When the user describes work to do, output a structured JSON block with the tasks
- Always wrap structured output in a markdown code block tagged \`\`\`json-tasks
- Each task object must have: title (string), priority ("high"|"medium"|"low"), dueDate (ISO date string or null), notes (string or null)
- Optional fields: buyerId, listingId, address
- If the user describes multiple related steps, create multiple tasks as a workflow sequence
- Outside the JSON block, you may add a brief explanation
- If the request is ambiguous, ask clarifying questions
- Keep task titles concise and action-oriented (verb-first)
- Suggest reasonable due dates based on real estate timelines if not specified
- Never reference data from other clients or transactions

Example output format:
\`\`\`json-tasks
[
  {"title": "Order home inspection", "priority": "high", "dueDate": "2026-03-25", "notes": "Schedule with certified inspector"},
  {"title": "Review inspection report", "priority": "medium", "dueDate": "2026-03-28", "notes": null}
]
\`\`\``,

  add_buyer: `You are Clozze AI — an intelligent task operator inside Clozze, a real estate platform.

The user is adding a new buyer. You help them structure buyer information and preferences.

RULES:
- Parse the user's description into structured buyer data
- Always wrap structured output in a markdown code block tagged \`\`\`json-buyer
- The JSON object should have fields matching the buyer form: firstName, lastName, email, phone, preApprovedAmount, wantsNeeds
- Additionally, provide a structured preferences breakdown as "preferences" with: mustHaves (array), niceToHaves (array), dealbreakers (array), budgetContext (string), locationPreferences (array), followUpQuestions (array)
- Outside the JSON block, provide a brief summary
- If information is incomplete, suggest what to ask the buyer
- Never reference data from other clients

Example output format:
\`\`\`json-buyer
{
  "firstName": "Sarah",
  "lastName": "Johnson",
  "email": "",
  "phone": "",
  "preApprovedAmount": 500000,
  "wantsNeeds": "3 bed, 2 bath, good schools, under 500k",
  "preferences": {
    "mustHaves": ["3+ bedrooms", "2+ bathrooms", "Good school district"],
    "niceToHaves": ["Garage", "Updated kitchen", "Backyard"],
    "dealbreakers": ["Flood zone", "HOA over $300/mo"],
    "budgetContext": "Pre-approved at $500k, prefer to stay under $475k",
    "locationPreferences": ["Suburbs", "Near downtown", "School district A or B"],
    "followUpQuestions": ["What's their timeline to purchase?", "Do they have a home to sell first?", "Are they open to new construction?"]
  }
}
\`\`\``,

  add_listing: `You are Clozze AI — an intelligent task operator inside Clozze, a real estate platform.

The user is adding a new listing. You help them structure listing information and generate marketing content.

RULES:
- Parse the user's description into structured listing data
- Always wrap structured output in a markdown code block tagged \`\`\`json-listing
- The JSON object should have fields matching the listing form: sellerFirstName, sellerLastName, sellerEmail, sellerPhone, address, city, zipcode, county, bedrooms, bathrooms, sqFeet, listingPrice
- Additionally, provide: description (MLS-ready listing description), highlights (array of key feature bullets), missingFields (array of fields that should be filled), researchSuggestions (array of things to research)
- Outside the JSON block, provide a brief summary
- If information is incomplete, identify what's missing
- For descriptions, write compelling MLS-ready copy
- Never reference data from other clients or listings

Example output format:
\`\`\`json-listing
{
  "sellerFirstName": "John",
  "address": "123 Oak St",
  "city": "Austin",
  "bedrooms": 3,
  "bathrooms": 2,
  "sqFeet": 1800,
  "listingPrice": 425000,
  "description": "Stunning 3-bedroom home in the heart of Austin...",
  "highlights": ["Updated kitchen with granite counters", "Large backyard with mature trees", "Minutes from downtown"],
  "missingFields": ["sellerEmail", "zipcode", "county"],
  "researchSuggestions": ["Recent comparable sales within 0.5 miles", "School district ratings", "HOA details if applicable"]
}
\`\`\``,
};

const FLOW_SUGGESTIONS: Record<FlowType, string[]> = {
  create_task: [
    'Create a listing prep workflow',
    'Add tasks for closing this buyer',
    'Create inspection + title tasks',
    'Add a follow-up sequence',
  ],
  add_buyer: [
    'Structure buyer preferences',
    'Identify missing buyer info',
    'Suggest follow-up questions',
    'Categorize wants vs needs',
  ],
  add_listing: [
    'Write listing description',
    'Identify missing fields',
    'Generate feature highlights',
    'What should I research?',
  ],
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { flow, message, conversationHistory, existingFormData } = body;

    if (!flow || !['create_task', 'add_buyer', 'add_listing'].includes(flow)) {
      throw new Error('Invalid flow type');
    }
    if (!message || typeof message !== 'string' || message.length > 5000) {
      throw new Error('message is required (max 5000 chars)');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // Auth
    const authHeader = req.headers.get('authorization');
    if (!authHeader) throw new Error('No authorization header');

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error('Authentication failed');

    const flowType = flow as FlowType;

    // Build context from existing form data if provided
    let formContext = '';
    if (existingFormData && typeof existingFormData === 'object') {
      const entries = Object.entries(existingFormData)
        .filter(([_, v]) => v !== '' && v !== null && v !== undefined)
        .map(([k, v]) => `- ${k}: ${v}`)
        .join('\n');
      if (entries) {
        formContext = `\n\n## Current Form Data\nThe user has already filled in:\n${entries}\n\nUse this context to provide relevant suggestions and avoid re-asking for known information.`;
      }
    }

    // Fetch user's existing data for context (entity resolution)
    let entityContext = '';
    if (flowType === 'create_task') {
      const [buyersRes, listingsRes] = await Promise.all([
        supabase.from('buyers').select('id, first_name, last_name').eq('user_id', user.id).limit(50),
        supabase.from('listings').select('id, address, city').eq('user_id', user.id).limit(50),
      ]);
      const parts: string[] = [];
      if (buyersRes.data?.length) {
        parts.push(`Available buyers: ${buyersRes.data.map(b => `${b.first_name} ${b.last_name} (${b.id})`).join(', ')}`);
      }
      if (listingsRes.data?.length) {
        parts.push(`Available listings: ${listingsRes.data.map(l => `${l.address}, ${l.city} (${l.id})`).join(', ')}`);
      }
      if (parts.length) {
        entityContext = `\n\n## Available Entities\n${parts.join('\n')}\nIf the user mentions a buyer or listing by name, include the matching ID in the task object as buyerId or listingId.`;
      }
    }

    const systemPrompt = FLOW_SYSTEM_PROMPTS[flowType] + formContext + entityContext;

    const messages: any[] = [
      { role: 'system', content: systemPrompt },
    ];

    if (conversationHistory && Array.isArray(conversationHistory)) {
      const recentHistory = conversationHistory.slice(-10);
      for (const msg of recentHistory) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
    }

    messages.push({ role: 'user', content: message });

    // Stream the response
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limited. Please wait a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('AI gateway error');
    }

    // Send metadata first, then stream
    const metadata = {
      flow: flowType,
      suggestions: FLOW_SUGGESTIONS[flowType],
    };

    const metadataEvent = `data: ${JSON.stringify({ metadata })}\n\n`;
    const encoder = new TextEncoder();
    const metadataChunk = encoder.encode(metadataEvent);

    const combinedStream = new ReadableStream({
      async start(controller) {
        controller.enqueue(metadataChunk);
        const reader = response.body!.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        } catch (err) {
          console.error('Stream error:', err);
        } finally {
          controller.close();
        }
      }
    });

    return new Response(combinedStream, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });

  } catch (error) {
    console.error('Clozze AI create error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
