import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const AI_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!AI_API_KEY) {
      throw new Error('AI_API_KEY is not configured');
    }

    // Extract and validate bearer token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized - Missing bearer token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    const supabase = createClient(
      SUPABASE_URL ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // verify_jwt=false; we MUST pass the token explicitly
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const adminClient = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const body = await req.json();
    const { action, emailId, limit = 10 } = body;

    // Fetch user's communication preferences for AI context
    const { data: preferences } = await adminClient
      .from('agent_communication_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Build style context from trained preferences
    let styleContext = '';
    if (preferences) {
      styleContext = `
The real estate agent has the following communication style preferences:
- General client communication style: ${preferences.general_client_scenario || 'Not specified'}
- Good news to buyers: ${preferences.buyer_good_news_scenario || 'Not specified'}
- Bad news to buyers: ${preferences.buyer_bad_news_scenario || 'Not specified'}
- New listing announcements: ${preferences.listing_new_listing_scenario || 'Not specified'}
- Price reduction recommendations: ${preferences.listing_price_reduction_scenario || 'Not specified'}
- Lender communications: ${preferences.preferred_lender_scenario || 'Not specified'}
- Title company communications: ${preferences.title_company_scenario || 'Not specified'}
- Team communications: ${preferences.coworker_team_scenario || 'Not specified'}

When suggesting action items, consider these communication patterns and preferences.
${preferences.has_booking_link && preferences.booking_link_url ? `The agent uses a booking link: ${preferences.booking_link_url}` : ''}
`;
    }

    if (action === "analyze_single") {
      // Analyze a single email
      const { data: email, error: emailError } = await adminClient
        .from("synced_emails")
        .select("*")
        .eq("id", emailId)
        .eq("user_id", user.id)
        .single();

      if (emailError || !email) {
        throw new Error("Email not found");
      }

      const systemPrompt = `You are an AI assistant for a real estate agent. Your job is to analyze incoming emails and identify which ones require a response or action from the agent.
${styleContext}

Analyze the email and provide:
1. Whether this email REQUIRES ACTION from the agent (questions needing answers, requests, deadlines, decisions needed)
2. A clear, actionable summary of what the agent should do (if action is required) - MAXIMUM 1-2 sentences. If no action is required, write a brief 1-sentence summary of what the email is about.
3. A priority level (low, medium, high, urgent)
4. A category (client, lender, title_company, showing, offer, inspection, closing, marketing, team, other)

IMPORTANT: Only mark requires_action as true if the email genuinely needs a response or action. Examples that DO require action:
- Direct questions needing an answer
- Requests for information, meetings, or showings
- Time-sensitive matters or deadlines
- Offers or negotiations requiring response
- Issues needing resolution

Examples that do NOT require action:
- Newsletters, marketing emails, promotions
- Automated confirmations or receipts
- FYI/informational emails with no ask
- Thank you messages with no follow-up needed
- Spam or irrelevant emails

CRITICAL: 
- Keep action_item to 1-2 sentences maximum. Be direct and concise.
- NEVER return "None", "N/A", or empty strings for action_item. Always provide a brief summary.`;

      const userPrompt = `Analyze this email:

From: ${email.sender_name} <${email.sender_email}>
Subject: ${email.subject}

Content:
${email.body_preview || email.snippet}

Determine if this email requires action from the agent.`;

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "analyze_email",
                description: "Analyze an email and determine if it requires action",
                parameters: {
                  type: "object",
                  properties: {
                    requires_action: { type: "boolean", description: "True if the email requires a response or action from the agent" },
                    action_item: { type: "string", description: "A clear, actionable task for the agent (if requires_action is true)" },
                    priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
                    category: { type: "string" }
                  },
                  required: ["requires_action", "action_item", "priority", "category"],
                  additionalProperties: false
                }
              }
            }
          ],
          tool_choice: { type: "function", function: { name: "analyze_email" } }
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
        throw new Error('AI gateway error');
      }

      const aiResponse = await response.json();
      const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
      
      if (!toolCall?.function?.arguments) {
        throw new Error("No analysis result from AI");
      }

      const analysis = JSON.parse(toolCall.function.arguments);

      // Update the email with analysis
      const { error: updateError } = await adminClient
        .from("synced_emails")
        .update({
          ai_analyzed: true,
          ai_action_item: analysis.action_item,
          ai_priority: analysis.priority,
          ai_category: analysis.category,
          ai_requires_action: analysis.requires_action === true,
        })
        .eq("id", emailId);

      if (updateError) {
        console.error("Error updating email with analysis:", updateError);
      }

      return new Response(
        JSON.stringify({ success: true, analysis }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === "analyze_batch") {
      // Get unanalyzed emails
      const { data: emails, error: emailsError } = await adminClient
        .from("synced_emails")
        .select("*")
        .eq("user_id", user.id)
        .eq("ai_analyzed", false)
        .order("received_at", { ascending: false })
        .limit(limit);

      if (emailsError) {
        throw new Error("Failed to fetch emails");
      }

      if (!emails || emails.length === 0) {
        return new Response(
          JSON.stringify({ success: true, analyzed: 0, message: "No unanalyzed emails" }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let analyzedCount = 0;
      
      for (const email of emails) {
        try {
          const systemPrompt = `You are an AI assistant for a real estate agent. Analyze emails and determine which ones require a response or action.
${styleContext}

IMPORTANT: Only mark requires_action as true if the email genuinely needs a response or action:
- Direct questions, requests, deadlines, decisions needed = requires action
- Newsletters, confirmations, FYI emails, thank yous = does NOT require action

CRITICAL: 
- Keep action_item to 1-2 sentences maximum. Be direct and concise.
- NEVER return "None", "N/A", or empty strings for action_item. Always provide a brief summary of the email content.`;

          const userPrompt = `Analyze this email and determine if it requires action:

From: ${email.sender_name} <${email.sender_email}>
Subject: ${email.subject}

Content:
${email.body_preview || email.snippet}`;

          const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${AI_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
              ],
              tools: [
                {
                  type: "function",
                  function: {
                    name: "analyze_email",
                    description: "Analyze an email and determine if it requires action",
                    parameters: {
                      type: "object",
                      properties: {
                        requires_action: { type: "boolean", description: "True if email requires response or action" },
                        action_item: { type: "string" },
                        priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
                        category: { type: "string" }
                      },
                      required: ["requires_action", "action_item", "priority", "category"],
                      additionalProperties: false
                    }
                  }
                }
              ],
              tool_choice: { type: "function", function: { name: "analyze_email" } }
            }),
          });

          if (response.ok) {
            const aiResponse = await response.json();
            const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
            
            if (toolCall?.function?.arguments) {
              const analysis = JSON.parse(toolCall.function.arguments);

              await adminClient
                .from("synced_emails")
                .update({
                  ai_analyzed: true,
                  ai_action_item: analysis.action_item,
                  ai_priority: analysis.priority,
                  ai_category: analysis.category,
                  ai_requires_action: analysis.requires_action === true,
                })
                .eq("id", email.id);

              analyzedCount++;
            }
          }
        } catch (err) {
          console.error(`Error analyzing email ${email.id}:`, err);
        }
      }

      return new Response(
        JSON.stringify({ success: true, analyzed: analyzedCount }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    console.error('Email analysis error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
