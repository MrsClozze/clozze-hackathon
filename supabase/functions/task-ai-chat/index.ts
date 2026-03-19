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
- Address: ${context.task.address || 'Not set'}`);
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
- Seller: ${l.seller_first_name || ''} ${l.seller_last_name || ''} | Email: ${l.seller_email || 'N/A'} | Phone: ${l.seller_phone || 'N/A'}`);
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
    const { taskId, message, conversationHistory } = body;

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

    // Verify task belongs to user (or shared team)
    // For simplicity, we trust RLS on the client side already filtered
    
    const context: any = { task };

    // Fetch related records in parallel
    const promises: Promise<void>[] = [];

    if (task.listing_id) {
      promises.push(
        supabase.from('listings').select('*').eq('id', task.listing_id).single()
          .then(({ data }) => { if (data) context.listing = data; })
      );
    }

    if (task.buyer_id) {
      promises.push(
        supabase.from('buyers').select('*').eq('id', task.buyer_id).single()
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
    const needsResearch = shouldDoResearch(message, taskType);

    if (needsResearch && FIRECRAWL_API_KEY) {
      const queries = buildResearchQueries(message, context, taskType);
      
      const searchPromises = queries.map(async (query: string) => {
        try {
          const response = await fetch('https://api.firecrawl.dev/v1/search', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query,
              limit: 5,
              scrapeOptions: { formats: ['markdown'] },
            }),
          });

          if (response.ok) {
            const data = await response.json();
            return data.data?.map((r: any) => ({
              title: r.title,
              url: r.url,
              snippet: r.markdown?.substring(0, 500) || r.description || '',
            })) || [];
          }
          return [];
        } catch (err) {
          console.error('Firecrawl search error:', err);
          return [];
        }
      });

      const results = await Promise.all(searchPromises);
      researchResults = results.flat().slice(0, 10);
    }

    // ====== LAYER 3: LLM reasoning ======
    const contextPrompt = buildContextPrompt(context);
    
    let toneContext = '';
    if (context.preferences) {
      toneContext = `\nMatch the agent's communication style based on their preferences. Be professional but personable.`;
    }

    let researchContext = '';
    if (researchResults.length > 0) {
      researchContext = `\n\n## External Research Results
${researchResults.map((r, i) => `${i + 1}. **${r.title}** (${r.url})\n${r.snippet}`).join('\n\n')}

Use these research results to provide accurate, current information. Cite sources when referencing external data.`;
    }

    const baseSystemPrompt = typeConfig?.systemContext || 
      `You are a helpful real estate assistant embedded inside a task. Help the agent complete this task efficiently using the available context.`;

    const systemPrompt = `${baseSystemPrompt}

You are an intelligent task assistant inside Clozze, a real estate platform. You have access to the agent's task details, property information, buyer/seller data, and transaction context.

RULES:
- Always stay scoped to the current task and its related records
- Never reference or leak data from other clients or transactions
- When you use external research, clearly indicate it
- Provide actionable, specific guidance
- Format responses with markdown for readability
- When suggesting actions, use these markers:
  [ACTION:create_task] for suggesting a new task
  [ACTION:update_notes] for suggesting notes to save
  [ACTION:save_draft] for content the user might want to save
${toneContext}

${contextPrompt}
${researchContext}`;

    // Build messages array with conversation history
    const messages: any[] = [
      { role: 'system', content: systemPrompt },
    ];

    if (conversationHistory && Array.isArray(conversationHistory)) {
      // Only include last 20 messages for context window management
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
      researchSources: researchResults.map(r => ({ title: r.title, url: r.url })),
    };

    const metadataEvent = `data: ${JSON.stringify({ metadata })}\n\n`;
    const encoder = new TextEncoder();
    const metadataChunk = encoder.encode(metadataEvent);

    // Combine metadata event with the AI stream
    const combinedStream = new ReadableStream({
      async start(controller) {
        // Send metadata first
        controller.enqueue(metadataChunk);

        // Then pipe through the AI stream
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

function shouldDoResearch(message: string, taskType: string): boolean {
  const researchKeywords = [
    'research', 'find', 'search', 'look up', 'comps', 'comparable',
    'neighborhood', 'school', 'utility', 'hoa', 'inspector', 'inspection',
    'county', 'zoning', 'flood', 'tax', 'market', 'pricing', 'price',
    'builder', 'permit', 'walkability', 'transit', 'crime',
  ];
  const lowerMessage = message.toLowerCase();
  
  // Always research for certain task types with relevant prompts
  if (['comps_pricing', 'home_inspection'].includes(taskType)) {
    if (researchKeywords.some(kw => lowerMessage.includes(kw))) return true;
  }
  
  return researchKeywords.some(kw => lowerMessage.includes(kw));
}

function buildResearchQueries(message: string, context: any, taskType: string): string[] {
  const queries: string[] = [];
  const address = context.listing?.address || context.task?.address || '';
  const city = context.listing?.city || '';
  const location = [address, city].filter(Boolean).join(', ');

  if (!location) {
    // Without a location, do a general search based on the message
    queries.push(message);
    return queries;
  }

  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('comp') || lowerMessage.includes('pricing') || lowerMessage.includes('price')) {
    const beds = context.listing?.bedrooms || '';
    const baths = context.listing?.bathrooms || '';
    const sqft = context.listing?.sq_feet || '';
    queries.push(`comparable homes recently sold near ${location} ${beds ? beds + ' bed' : ''} ${baths ? baths + ' bath' : ''} ${sqft ? sqft + ' sqft' : ''}`);
  }

  if (lowerMessage.includes('school')) {
    queries.push(`schools near ${location} ratings reviews`);
  }

  if (lowerMessage.includes('neighborhood') || lowerMessage.includes('area')) {
    queries.push(`${location} neighborhood guide amenities walkability`);
  }

  if (lowerMessage.includes('hoa')) {
    queries.push(`HOA homeowners association ${location}`);
  }

  if (lowerMessage.includes('inspector') || lowerMessage.includes('inspection')) {
    queries.push(`home inspectors near ${city || location} reviews ratings`);
  }

  if (lowerMessage.includes('utility') || lowerMessage.includes('utilities')) {
    queries.push(`utility providers ${city || location} electric water gas`);
  }

  if (lowerMessage.includes('zoning') || lowerMessage.includes('permit')) {
    queries.push(`zoning permits ${location} county`);
  }

  if (lowerMessage.includes('flood')) {
    queries.push(`flood zone map ${location}`);
  }

  if (lowerMessage.includes('tax')) {
    queries.push(`property tax records ${location}`);
  }

  // If no specific category matched, do a general property research query
  if (queries.length === 0) {
    queries.push(`${location} real estate ${message.substring(0, 100)}`);
  }

  return queries.slice(0, 3); // Max 3 queries
}
