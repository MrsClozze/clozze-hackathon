import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Task type configurations with prompts and suggested actions
const TASK_TYPE_CONFIGS: Record<string, {
  keywords: string[];
  systemContext: string;
  suggestedActions: string[];
  firecrawlCategories: string[];
}> = {
  prepare_listing: {
    keywords: ['prepare listing', 'listing prep', 'list property', 'get listing ready'],
    systemContext: `You are helping a real estate agent prepare a property listing. Focus on:
- Property overview and key selling points
- Missing information that needs to be gathered
- Preparation checklist items
- Market context and positioning
- Recommended next steps before going live`,
    suggestedActions: ['Summarize property', 'Find comps', 'Write listing description', 'What am I missing?', 'Research neighborhood', 'Prepare MLS notes'],
    firecrawlCategories: ['comps', 'schools', 'utilities', 'hoa', 'neighborhood', 'zoning'],
  },
  listing_description: {
    keywords: ['listing description', 'mls description', 'write description', 'create description'],
    systemContext: `You are helping a real estate agent write a compelling MLS listing description. Focus on:
- Highlight key features and upgrades
- Neighborhood and location benefits
- Lifestyle appeal
- MLS compliance and formatting
- Multiple version options`,
    suggestedActions: ['Write MLS description', 'Highlight features', 'Neighborhood highlights', 'Alternate versions', 'Check MLS compliance'],
    firecrawlCategories: ['neighborhood', 'schools', 'walkability'],
  },
  comps_pricing: {
    keywords: ['comp', 'comparable', 'pricing', 'price', 'cma', 'market analysis'],
    systemContext: `You are helping a real estate agent research comparable properties and pricing strategy. Focus on:
- Finding and analyzing comparable sales
- Price positioning recommendations
- Market trend context
- Data completeness caveats
- Supporting rationale for pricing decisions`,
    suggestedActions: ['Find comps', 'Suggest pricing', 'Market trends', 'Price comparison', 'What data is missing?'],
    firecrawlCategories: ['comps', 'market_data', 'recent_sales'],
  },
  listing_agreement: {
    keywords: ['listing agreement', 'prepare agreement', 'seller agreement'],
    systemContext: `You are helping a real estate agent prepare a listing agreement. Focus on:
- Summarizing seller and property context
- Required information checklist
- Draft supporting communications
- Missing information identification
- Next steps in the agreement process`,
    suggestedActions: ['Summarize seller + property', 'Draft email', 'What info is missing?', 'Create checklist'],
    firecrawlCategories: ['property_records', 'tax_records'],
  },
  title_search: {
    keywords: ['title search', 'order title', 'title company', 'title work'],
    systemContext: `You are helping a real estate agent with ordering a title search. Focus on:
- What information is needed before ordering
- Preferred title partners if applicable
- Creating notes and reminders
- Draft communications to title company
- Missing information identification`,
    suggestedActions: ['What is needed?', 'Draft title request', 'Create reminders', 'Check missing info'],
    firecrawlCategories: ['title_company', 'county_records'],
  },
  home_inspection: {
    keywords: ['inspection', 'home inspection', 'order inspection', 'inspector'],
    systemContext: `You are helping a real estate agent with ordering a home inspection. Focus on:
- What inspections should be requested
- Finding qualified inspectors if needed
- Draft outreach communications
- Follow-up tasks and reminders
- Timeline considerations`,
    suggestedActions: ['Find inspectors', 'Draft inspection request', 'What should I ask for?', 'Create follow-up reminders'],
    firecrawlCategories: ['inspectors', 'inspection_companies'],
  },
  buyer_task: {
    keywords: ['buyer', 'offer', 'purchase', 'showing', 'pre-approval'],
    systemContext: `You are helping a real estate agent with a buyer-side task. Focus on:
- Buyer details and preferences
- Next steps in the transaction
- Offer preparation help
- Property intelligence for decision-making
- Timeline and obligation management`,
    suggestedActions: ['Summarize buyer', 'Next steps', 'Draft offer notes', 'Timeline check', 'What is missing?'],
    firecrawlCategories: ['property_data', 'neighborhood', 'schools', 'market_data'],
  },
};

function detectTaskType(title: string): string {
  const lowerTitle = title.toLowerCase();
  for (const [type, config] of Object.entries(TASK_TYPE_CONFIGS)) {
    if (config.keywords.some(kw => lowerTitle.includes(kw))) {
      return type;
    }
  }
  return 'general';
}

function buildContextPrompt(context: any): string {
  const parts: string[] = [];

  if (context.task) {
    parts.push(`## Current Task
- Title: ${context.task.title}
- Status: ${context.task.status || 'pending'}
- Priority: ${context.task.priority || 'medium'}
- Due Date: ${context.task.due_date || 'Not set'}
- Notes: ${context.task.notes || 'None'}
- Address: ${context.task.address || (context.listing ? `${context.listing.address}, ${context.listing.city}` : 'Not set')}`);
  }

  if (context.listing) {
    const l = context.listing;
    parts.push(`## Property / Listing
- Address: ${l.address}, ${l.city}${l.county ? ', ' + l.county : ''}${l.zipcode ? ' ' + l.zipcode : ''}
- Price: $${l.price?.toLocaleString() || 'Not set'}
- Beds: ${l.bedrooms ?? 'N/A'} | Baths: ${l.bathrooms ?? 'N/A'} | Sq Ft: ${l.sq_feet ?? 'N/A'}
- Status: ${l.status || 'N/A'}
- Days on Market: ${l.days_on_market ?? 'N/A'}
- Listing Start: ${l.listing_start_date || 'N/A'} | End: ${l.listing_end_date || 'N/A'}
- Seller: ${l.seller_first_name || ''} ${l.seller_last_name || ''} | Email: ${l.seller_email || 'N/A'} | Phone: ${l.seller_phone || 'N/A'}
- Description: ${l.description ? l.description.substring(0, 500) + (l.description.length > 500 ? '…' : '') : 'Not yet written'}
- Highlights: ${l.highlights && l.highlights.length > 0 ? l.highlights.join(', ') : 'None set'}
- Marketing Copy: ${l.marketing_copy && Object.keys(l.marketing_copy).length > 0 ? Object.keys(l.marketing_copy).join(', ') + ' variants' : 'None'}
- Internal Notes: ${Array.isArray(l.internal_notes) && l.internal_notes.length > 0 ? l.internal_notes.length + ' entries' : 'None'}`);
  }

  if (context.buyer) {
    const b = context.buyer;
    parts.push(`## Buyer
- Name: ${b.first_name} ${b.last_name}
- Email: ${b.email || 'N/A'} | Phone: ${b.phone || 'N/A'}
- Status: ${b.status || 'N/A'}
- Pre-Approved Amount: ${b.pre_approved_amount ? '$' + b.pre_approved_amount.toLocaleString() : 'N/A'}
- Wants/Needs: ${b.wants_needs || 'Not specified'}`);
  }

  if (context.transaction) {
    const t = context.transaction;
    parts.push(`## Transaction
- State: ${t.state || 'N/A'}
- Property Type: ${t.property_type || 'N/A'}
- Financing: ${t.financing_type || 'N/A'}
- HOA: ${t.has_hoa ? 'Yes' : t.has_hoa === false ? 'No' : 'Unknown'}
- Target Close: ${t.target_close_date || 'Not set'}
- Notes: ${t.notes || 'None'}`);
  }

  if (context.relatedTasks && context.relatedTasks.length > 0) {
    parts.push(`## Related Tasks (same transaction/property)
${context.relatedTasks.map((t: any) => `- [${t.status}] ${t.title}${t.due_date ? ' (due: ' + t.due_date + ')' : ''}`).join('\n')}`);
  }

  return parts.join('\n\n');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { taskId, message, conversationHistory, conversational } = body;

    if (!taskId || typeof taskId !== 'string') {
      throw new Error('taskId is required');
    }
    if (!message || typeof message !== 'string' || message.length > 5000) {
      throw new Error('message is required (max 5000 chars)');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    // Auth
    const authHeader = req.headers.get('authorization');
    if (!authHeader) throw new Error('No authorization header');

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error('Authentication failed');

    // ====== LAYER 1: Fetch Clozze context ======
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (taskError || !task) throw new Error('Task not found');

    // STRICT CONTEXT ISOLATION: Verify task belongs to this user
    if (task.user_id !== user.id) {
      throw new Error('Unauthorized: task does not belong to this user');
    }
    
    const context: any = { task };

    // Fetch related records in parallel
    const promises: Promise<void>[] = [];

    if (task.listing_id) {
      promises.push(
        supabase.from('listings').select('*').eq('id', task.listing_id).eq('user_id', user.id).single()
          .then(({ data }) => { if (data) context.listing = data; })
      );
    }

    if (task.buyer_id) {
      promises.push(
        supabase.from('buyers').select('*').eq('id', task.buyer_id).eq('user_id', user.id).single()
          .then(({ data }) => { if (data) context.buyer = data; })
      );
    }

    // Fetch transaction if listing or buyer is linked
    if (task.listing_id || task.buyer_id) {
      promises.push(
        supabase.from('transactions').select('*')
          .or(`listing_id.eq.${task.listing_id || '00000000-0000-0000-0000-000000000000'},buyer_id.eq.${task.buyer_id || '00000000-0000-0000-0000-000000000000'}`)
          .eq('user_id', user.id)
          .limit(1)
          .then(({ data }) => { if (data && data.length > 0) context.transaction = data[0]; })
      );
    }

    // Fetch related tasks (same listing or buyer)
    if (task.listing_id || task.buyer_id) {
      const filter = task.listing_id 
        ? `listing_id.eq.${task.listing_id}` 
        : `buyer_id.eq.${task.buyer_id}`;
      promises.push(
        supabase.from('tasks').select('title, status, due_date, priority')
          .or(filter)
          .eq('user_id', user.id)
          .neq('id', taskId)
          .limit(20)
          .then(({ data }) => { if (data) context.relatedTasks = data; })
      );
    }

    // Fetch communication preferences for tone
    promises.push(
      supabase.from('agent_communication_preferences').select('*')
        .eq('user_id', user.id).single()
        .then(({ data }) => { if (data) context.preferences = data; })
    );

    await Promise.all(promises);

    // Detect task type
    const taskType = detectTaskType(task.title);
    const typeConfig = TASK_TYPE_CONFIGS[taskType];

    // ====== LAYER 2: Determine if Firecrawl research is needed ======
    let researchResults: any[] = [];
    let researchCategories: string[] = [];

    // Check for vague/open-ended requests that need clarification first
    if (isVagueRequest(message, context)) {
      // Skip research — the system prompt will guide the LLM to ask clarifying questions
      console.log('Vague request detected, skipping research to ask clarifying questions');
    }

    const needsResearch = !isVagueRequest(message, context) && shouldDoResearch(message, taskType);

    if (needsResearch && FIRECRAWL_API_KEY) {
      const queryPlan = buildResearchQueries(message, context, taskType);
      researchCategories = queryPlan.map(q => q.category);
      
      const searchPromises = queryPlan.map(async (plan) => {
        try {
          const response = await fetch('https://api.firecrawl.dev/v1/search', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: plan.query,
              limit: 5,
              scrapeOptions: { formats: ['markdown'] },
            }),
          });

          if (response.ok) {
            const data = await response.json();
            return (data.data?.map((r: any) => ({
              title: r.title,
              url: r.url,
              snippet: r.markdown?.substring(0, 500) || r.description || '',
              category: plan.category,
            })) || []);
          }
          return [];
        } catch (err) {
          console.error('Firecrawl search error:', err);
          return [];
        }
      });

      const results = await Promise.all(searchPromises);
      researchResults = results.flat().slice(0, 12);
    }

    // ====== LAYER 3: LLM reasoning ======
    const contextPrompt = buildContextPrompt(context);
    
    let toneContext = '';
    if (context.preferences) {
      toneContext = `\nMatch the agent's communication style based on their preferences. Be professional but personable.`;
    }

    let researchContext = '';
    if (researchResults.length > 0) {
      // Group results by category for structured presentation
      const grouped: Record<string, typeof researchResults> = {};
      for (const r of researchResults) {
        const cat = r.category || 'general';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(r);
      }

      const categoryLabels: Record<string, string> = {
        comps: 'Comparable Sales',
        neighborhood: 'Neighborhood Context',
        schools: 'Schools',
        utilities: 'Utilities',
        hoa: 'HOA Details',
        inspectors: 'Home Inspectors',
        property_records: 'Property Records',
        tax: 'Tax Records',
        zoning: 'Zoning & Permits',
        flood: 'Flood Zone',
        county: 'County Records',
        general: 'General Research',
      };

      const sections = Object.entries(grouped).map(([cat, items]) => {
        const label = categoryLabels[cat] || cat;
        return `### ${label}\n${items.map((r, i) => `${i + 1}. **${r.title}** (${r.url})\n${r.snippet}`).join('\n\n')}`;
      });

      researchContext = `\n\n## External Research Results
${sections.join('\n\n')}

IMPORTANT RULES FOR USING RESEARCH:
- Clearly label information from external research with "Based on external research:" or "According to [Source]:"
- Separate your own analysis and assumptions from externally sourced findings
- When presenting research findings, structure them into clear categories (e.g., "## Comparable Sales", "## Neighborhood Context")
- If research data seems outdated or unreliable, flag it with a caveat
- Never present external findings as Clozze internal data
- When research supports a recommendation, cite the source`;
    }

    const baseSystemPrompt = typeConfig?.systemContext || 
      `You are a proactive real estate task operator embedded inside a task. Help the agent complete this task efficiently using the available context.`;

    const systemPrompt = `${baseSystemPrompt}

You are Clozze AI — an intelligent task operator inside Clozze (pronounced "Close"), a real estate platform. You are NOT a generic chatbot. You actively help agents complete work by providing structured, actionable outputs.

IMPORTANT PRONUNCIATION: The brand name "Clozze" is pronounced exactly like the English word "Close". When generating any text that will be spoken aloud, write "Close" instead of "Clozze" so text-to-speech engines pronounce it correctly. In written-only output, use the correct spelling "Clozze".

You have access to the agent's task details, property information, buyer/seller data, and transaction context.

CRITICAL RULES — ACTION-ORIENTED OUTPUT:
- EVERY insight you provide MUST be paired with a concrete action the user can take.
- Do NOT just describe what is missing or what should happen. Instead, offer to DO IT.
- Use inline action markers to create clickable actions within your response.
- Format: [ACTION:action_type|Button Label] — these become clickable buttons in the UI.

STRICT ACTION VOCABULARY — only use these exact action types (nothing else):
- [ACTION:draft_message|Label] — Draft a message/email to a specific person
- [ACTION:create_task|Label] — Create a follow-up task
- [ACTION:create_tasks|Label] — Create multiple tasks from a list above
- [ACTION:save_notes|Label] — Save content to task notes
- [ACTION:save_draft|Label] — Save a draft message to task notes
- [ACTION:save_to_listing|Label] — Save to listing record
- [ACTION:save_to_listing_description|Label] — Save as listing description
- [ACTION:save_to_listing_highlights|Label] — Save as listing highlights
- [ACTION:save_to_listing_notes|Label] — Save to listing internal notes
- [ACTION:save_to_listing_marketing|Label] — Save marketing copy to listing
- [ACTION:resolve_group|Label] — Grouped resolution: saves draft + creates follow-up task
- [ACTION:create_follow_up|Label] — Create a follow-up reminder task

NEVER invent new action types. ONLY use the exact types listed above.

ACTION DENSITY & PRIORITY RULES:
- Use at most 3-4 action markers per response. Do NOT add an action to every bullet point.
- Place action markers on the MOST BLOCKING items first. Priority order:
  1. Items that block the next transaction step (e.g., missing seller contact when you need to send a listing agreement)
  2. Items that can be auto-generated now (e.g., description, highlights)
  3. Items that require follow-up (e.g., confirming details with a client)
- For the "Recommended Next Step" section, use exactly 1 action marker — always the single highest-impact item.
- Use [ACTION:resolve_group|...] ONLY when ALL of these are true:
  - 3 or more genuinely related gaps exist (e.g., multiple missing property details)
  - They can realistically be addressed in ONE message to ONE person
  - A single follow-up task makes sense for all of them
  - Do NOT use resolve_group for unrelated items that happen to be missing at the same time
- For single issues, always use the specific action type (draft_message, create_task, etc.).

ACTION LABEL GUIDELINES — labels must sound natural and user-facing:
- GOOD: "Message Seller for Details", "Generate Description", "Create Follow-Up", "Save to Listing"
- BAD: "draft_message", "Execute Resolution", "Process Data", "Run Action"
- Labels should describe what happens from the user's perspective, not technical operations.
- Keep labels to 2-5 words. Never include action type names in labels.

RESPONSE STRUCTURE:
Instead of passive checklists, use this action-oriented format:

## ✅ Complete
Brief list of what's already in place (no action markers here).

## ⚠️ Needs Resolution
For EACH missing/problematic item, include:
- What the issue is (1 sentence max)
- For the top 2-3 most important items, add the specific [ACTION:...] marker
- List items in priority order — most blocking first

Example:
- **Seller contact missing** — Need email/phone to send the listing agreement. [ACTION:draft_message|Request Seller Contact Info]
- **Description not written** — Ready to generate from available details. [ACTION:save_to_listing_description|Generate & Save Description]
- **APN not confirmed** — Will need county records verification.

## 🎯 Recommended Next Step
The single most important action right now (with exactly one action marker). This should always be the item that unblocks the most downstream work.

When 3+ genuinely related gaps can be resolved in one client message, offer a grouped resolution:
- "Seller needs to confirm address, legal description, and HOA status" → [ACTION:resolve_group|Request All Property Details from Seller]

SCENARIO-SPECIFIC GUIDANCE:
- **Conflicting property data**: Proactively surface the discrepancy, show both values, and immediately offer to draft a clarification message to the relevant party.
- **Missing seller/buyer details**: Don't just list what's missing — offer to draft the specific outreach message to collect it.
- **Incomplete buyer profile**: Identify what stage the buyer is in and offer the most relevant action (structure preferences, request pre-approval letter, etc.).
- **Listing prep with multiple gaps**: Separate what can be auto-generated (description, highlights) from what needs client input (HOA, legal details), and prioritize the auto-generatable items first since they don't require waiting.

COMPARABLE PROPERTIES FORMAT:
When presenting comps or comparable sales:
- Use a consistent format for each comp:
  **Address** | Price | Beds/Baths | Sq Ft | DOM | Sold Date
- Clearly label data source: "Based on external research" or "AI interpretation"
- Include price-per-sqft comparison when possible
- Add a summary analysis section after the comp list

STYLE RULES:
- Be concise. Favor action over explanation.
- Maximum 1-2 sentences of context per issue before the action button.
- Don't repeat information the user already knows.
- When you identify a discrepancy, proactively surface it and offer the fix.
- When generating content (descriptions, messages, etc.), produce it immediately — don't ask if the user wants it.
- Always stay scoped to the current task and its related records.
- Never reference or leak data from other clients or transactions.
- When you use external research, briefly cite the source.
- Use markdown formatting: headers (##), bold (**), and concise bullet lists.

LISTING DESCRIPTION GUIDELINES:
When writing listing descriptions:
- Generate MLS-ready content with proper formatting
- Include a headline/hook, property details, lifestyle appeal, and call-to-action
- Content will be saved directly to the listing's description field

DIRECT TASK EXECUTION:
When the user asks to mark a task complete, change priority, or similar:
- Confirm the action clearly before suggesting it
- Use language like "I can mark this task as complete for you"

CLARIFICATION FOR VAGUE REQUESTS:
When the user gives a broad or vague instruction without specific criteria (e.g., "research homes", "find properties", "look up listings"):
- Do NOT immediately start researching or generating content
- Instead, ask 2-3 concise clarifying questions to narrow the scope
- Example clarifying questions: "What location or neighborhood?", "Any price range in mind?", "How many bedrooms/bathrooms are you looking for?"
- Once the user provides specifics, THEN proceed with research and results
- This mirrors how a real assistant would confirm requirements before taking action
${conversational ? `
CONVERSATION MODE — DUAL FORMAT RESPONSE:
You are in a live voice conversation. Return your response in TWO clearly marked sections:

[SPOKEN]
A concise, natural spoken summary (2-4 sentences, roughly 75-100 words max). Write exactly as you would speak to a real estate colleague over the phone. Use contractions, natural transitions, and conversational phrasing. Lead with the most important finding or recommendation. Do NOT include action markers, bullet points, headers, or any formatting here. End with a clear next-step suggestion.
Example tone: "So here's what I found — the listing looks mostly ready, but the seller's contact info is missing and you'll need that before sending the agreement. I'd suggest reaching out to get that first. Want me to draft that message?"
[/SPOKEN]

[FULL]
Your complete structured response with all details, formatting, and [ACTION:...] markers as usual. This appears in the written chat log.
[/FULL]

CRITICAL: You MUST include both [SPOKEN] and [FULL] sections with their exact tags. The spoken section is read aloud via text-to-speech. The full section appears in the chat history.
` : ''}
${toneContext}

${contextPrompt}
${researchContext}`;

    // Build messages array with conversation history
    const messages: any[] = [
      { role: 'system', content: systemPrompt },
    ];

    if (conversationHistory && Array.isArray(conversationHistory)) {
      const recentHistory = conversationHistory.slice(-20);
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
          JSON.stringify({ error: 'AI credits exhausted. Please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('AI gateway error');
    }

    // Return streaming response with metadata header
    const headers: Record<string, string> = {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
    };

    // Inject metadata as first SSE event
    const metadata = {
      taskType,
      suggestedActions: typeConfig?.suggestedActions || ['How can I help?', 'Summarize context', 'What is missing?'],
      usedResearch: researchResults.length > 0,
      researchCategories,
      researchSources: researchResults.map(r => ({ title: r.title, url: r.url, category: r.category })),
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

    return new Response(combinedStream, { headers });

  } catch (error) {
    console.error('Task AI chat error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function isVagueRequest(message: string, context: any): boolean {
  const lowerMsg = message.toLowerCase().trim();
  const vaguePatterns = [
    /^research\s+(homes?|properties|houses?|listings?)$/,
    /^find\s+(homes?|properties|houses?|listings?)$/,
    /^search\s+(homes?|properties|houses?|listings?)$/,
    /^look\s+up\s+(homes?|properties|houses?|listings?)$/,
    /^(what|show|get)\s+(me\s+)?(homes?|properties|houses?|listings?)$/,
  ];
  const isVague = vaguePatterns.some(p => p.test(lowerMsg));
  // Not vague if we already have location context
  if (isVague && (context.listing?.address || context.task?.address)) return false;
  return isVague;
}

function shouldDoResearch(message: string, taskType: string): boolean {
  const researchKeywords = [
    'research', 'find', 'search', 'look up', 'comps', 'comparable',
    'neighborhood', 'school', 'utility', 'utilities', 'hoa', 'inspector', 'inspection',
    'county', 'zoning', 'flood', 'tax', 'market', 'pricing', 'price',
    'builder', 'permit', 'walkability', 'transit', 'crime',
    'what am i missing', 'missing information', 'what else',
  ];
  const lowerMessage = message.toLowerCase();
  
  if (['comps_pricing', 'home_inspection'].includes(taskType)) {
    if (researchKeywords.some(kw => lowerMessage.includes(kw))) return true;
  }
  
  return researchKeywords.some(kw => lowerMessage.includes(kw));
}

interface ResearchQuery {
  query: string;
  category: string;
}

function buildResearchQueries(message: string, context: any, taskType: string): ResearchQuery[] {
  const queries: ResearchQuery[] = [];
  const address = context.listing?.address || context.task?.address || '';
  const city = context.listing?.city || '';
  const zipcode = context.listing?.zipcode || '';
  const location = [address, city].filter(Boolean).join(', ');

  if (!location) {
    queries.push({ query: message, category: 'general' });
    return queries;
  }

  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('comp') || lowerMessage.includes('pricing') || lowerMessage.includes('price') || lowerMessage.includes('cma')) {
    const beds = context.listing?.bedrooms || '';
    const baths = context.listing?.bathrooms || '';
    const sqft = context.listing?.sq_feet || '';
    queries.push({
      query: `comparable homes recently sold near ${location} ${beds ? beds + ' bed' : ''} ${baths ? baths + ' bath' : ''} ${sqft ? sqft + ' sqft' : ''}`,
      category: 'comps',
    });
  }

  if (lowerMessage.includes('school')) {
    queries.push({ query: `schools near ${location} ratings reviews`, category: 'schools' });
  }

  if (lowerMessage.includes('neighborhood') || lowerMessage.includes('area') || lowerMessage.includes('community')) {
    queries.push({ query: `${location} neighborhood guide amenities walkability safety`, category: 'neighborhood' });
  }

  if (lowerMessage.includes('hoa') || lowerMessage.includes('homeowner')) {
    queries.push({ query: `HOA homeowners association ${location} fees rules`, category: 'hoa' });
  }

  if (lowerMessage.includes('inspector') || lowerMessage.includes('inspection')) {
    queries.push({ query: `home inspectors near ${city || location} reviews ratings`, category: 'inspectors' });
  }

  if (lowerMessage.includes('utility') || lowerMessage.includes('utilities')) {
    queries.push({ query: `utility providers ${city || location} electric water gas sewer`, category: 'utilities' });
  }

  if (lowerMessage.includes('zoning') || lowerMessage.includes('permit')) {
    queries.push({ query: `zoning permits ${location} county regulations`, category: 'zoning' });
  }

  if (lowerMessage.includes('flood')) {
    queries.push({ query: `flood zone map ${location} FEMA`, category: 'flood' });
  }

  if (lowerMessage.includes('tax')) {
    queries.push({ query: `property tax records ${location} ${zipcode} county assessor`, category: 'tax' });
  }

  if (lowerMessage.includes('county')) {
    queries.push({ query: `${city || location} county property records assessor`, category: 'county' });
  }

  // "What am I missing" triggers multi-category research
  if (lowerMessage.includes('missing') || lowerMessage.includes('what else')) {
    if (!queries.some(q => q.category === 'neighborhood')) {
      queries.push({ query: `${location} neighborhood overview amenities`, category: 'neighborhood' });
    }
    if (!queries.some(q => q.category === 'schools')) {
      queries.push({ query: `schools near ${location} district ratings`, category: 'schools' });
    }
  }

  if (queries.length === 0) {
    queries.push({ query: `${location} real estate ${message.substring(0, 100)}`, category: 'general' });
  }

  return queries.slice(0, 3);
}
