import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const AI_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!AI_API_KEY) throw new Error("AI_API_KEY is not configured");

    const { input, teamMembers, buyers, listings, todayDate, timezone } = await req.json();

    if (!input || typeof input !== "string" || !input.trim()) {
      return new Response(JSON.stringify({ error: "Input text is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are a task parser for a real estate CRM application called Clozze. Your job is to extract structured task fields from natural language input.

Today's date is ${todayDate || new Date().toISOString().split("T")[0]}.
User's timezone: ${timezone || "America/Los_Angeles"}.

CONTEXT for entity resolution:
- Team members: ${JSON.stringify(teamMembers || [])}
- Buyers: ${JSON.stringify(buyers || [])}
- Listings: ${JSON.stringify(listings || [])}

RULES:
- Extract a clear, concise task title from the user's input.
- Resolve relative dates like "Friday", "next week", "tomorrow", "end of month" to YYYY-MM-DD format based on today's date.
- Match names mentioned to team members, buyers, or listings using fuzzy matching. Use the exact ID from the provided context.
- If you cannot confidently resolve a field, return null for that field.
- Priority defaults to "medium" unless the user specifies urgency.
- If the user mentions a person who could be a team member assignee, put their ID in assigneeUserIds.
- If the user mentions a buyer name, match to buyerId.
- If the user mentions an address or listing, match to listingId.
- Always extract a title. Use the core action/intent from the input.`;

    const tools = [
      {
        type: "function",
        function: {
          name: "create_parsed_task",
          description: "Return the structured task object parsed from the user's natural language input.",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string", description: "Clear, concise task title" },
              description: { type: ["string", "null"], description: "Optional longer description or notes" },
              dueDate: { type: ["string", "null"], description: "Due date in YYYY-MM-DD format" },
              startDate: { type: ["string", "null"], description: "Start date in YYYY-MM-DD if mentioned" },
              dueTime: { type: ["string", "null"], description: "Due time in HH:MM 24h format if mentioned" },
              priority: { type: "string", enum: ["low", "medium", "high"], description: "Task priority" },
              assigneeUserIds: {
                type: "array",
                items: { type: "string" },
                description: "Array of team member user IDs to assign the task to",
              },
              buyerId: { type: ["string", "null"], description: "Matched buyer ID if a buyer is mentioned" },
              listingId: { type: ["string", "null"], description: "Matched listing ID if a listing/address is mentioned" },
            },
            required: ["title", "priority"],
            additionalProperties: false,
          },
        },
      },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: input },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "create_parsed_task" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", status, text);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(data));
      return new Response(JSON.stringify({ error: "AI could not parse the input. Please try rephrasing." }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: any;
    try {
      parsed = typeof toolCall.function.arguments === "string"
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;
    } catch {
      console.error("Failed to parse tool call arguments:", toolCall.function.arguments);
      return new Response(JSON.stringify({ error: "AI returned invalid data. Please try again." }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-task-input error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
