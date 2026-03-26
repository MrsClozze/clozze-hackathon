import { Env, AIRequest, CORS_HEADERS, DurableMemoryState } from './types';

export { ListingMemory, BuyerMemory } from './memory';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    // Health check
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', ts: Date.now() }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Main AI orchestration endpoint
    if (url.pathname === '/ai/chat' && request.method === 'POST') {
      return handleAIChat(request, env);
    }

    // Direct memory access (for debugging / admin)
    if (url.pathname.startsWith('/memory/')) {
      return handleMemoryDirect(request, url, env);
    }

    return new Response('Not found', { status: 404, headers: CORS_HEADERS });
  },
};

// ─── AI Chat Orchestration ───────────────────────────────────────────────────

async function handleAIChat(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as AIRequest;
    const authHeader = request.headers.get('Authorization') || '';
    const supabaseAuth = request.headers.get('x-supabase-auth') || authHeader;

    // 1. Resolve memory from Durable Objects
    let memory: DurableMemoryState | null = null;
    let memoryStub: DurableObjectStub | null = null;
    let memoryType: 'listing' | 'buyer' | null = null;

    if (body.listingId) {
      const id = env.LISTING_MEMORY.idFromName(body.listingId);
      memoryStub = env.LISTING_MEMORY.get(id);
      memoryType = 'listing';
    } else if (body.buyerId) {
      const id = env.BUYER_MEMORY.idFromName(body.buyerId);
      memoryStub = env.BUYER_MEMORY.get(id);
      memoryType = 'buyer';
    }

    if (memoryStub) {
      const memRes = await memoryStub.fetch(new Request('https://do/get'));
      if (memRes.ok) {
        memory = await memRes.json() as DurableMemoryState;
      }
    }

    // 2. Build enriched context from memory
    const memoryContext = buildMemoryContext(memory, memoryType);

    // 3. Determine which edge function to call
    const flow = body.flow || 'task-ai-chat';
    const edgeFunctionUrl = `${env.SUPABASE_URL}/functions/v1/${flow}`;

    // 4. Build the forwarded payload with injected memory
    const enrichedHistory = [
      ...(memoryContext
        ? [{ role: 'system' as const, content: memoryContext }]
        : []),
      ...(body.conversationHistory || []),
    ];

    const forwardPayload: Record<string, unknown> = {
      ...body,
      conversationHistory: enrichedHistory,
      // Pass memory metadata so the edge function knows context is enriched
      _memoryInjected: !!memory,
      _memoryType: memoryType,
    };

    // 5. Forward to Supabase edge function (stream-through)
    const edgeResponse = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: supabaseAuth,
        apikey: env.SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(forwardPayload),
    });

    if (!edgeResponse.ok) {
      const errBody = await edgeResponse.text();
      return new Response(errBody, {
        status: edgeResponse.status,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // 6. Stream the response through to the client while capturing for memory
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const reader = edgeResponse.body?.getReader();

    if (!reader) {
      return new Response(JSON.stringify({ error: 'No response body' }), {
        status: 502,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Stream through and capture response for memory append
    const responseChunks: Uint8Array[] = [];

    const pump = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            responseChunks.push(value);
            await writer.write(value);
          }
        }
      } catch (err) {
        console.error('Stream error:', err);
      } finally {
        await writer.close();

        // After stream completes, append to memory asynchronously
        if (memoryStub && body.message) {
          const fullResponse = new TextDecoder().decode(
            concatUint8Arrays(responseChunks)
          );
          const assistantContent = extractContentFromSSE(fullResponse);

          try {
            await memoryStub.fetch(
              new Request('https://do/append', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  entries: [
                    { role: 'user', content: body.message, timestamp: Date.now() },
                    ...(assistantContent
                      ? [{ role: 'assistant', content: assistantContent, timestamp: Date.now() }]
                      : []),
                  ],
                }),
              })
            );
          } catch (memErr) {
            console.error('Memory append error:', memErr);
          }
        }
      }
    };

    // Don't await — let it stream
    pump();

    return new Response(readable, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    console.error('AI chat handler error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
}

// ─── Memory Direct Access ────────────────────────────────────────────────────

async function handleMemoryDirect(
  request: Request,
  url: URL,
  env: Env
): Promise<Response> {
  // /memory/listing/:id or /memory/buyer/:id
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.length < 3) {
    return new Response('Invalid path', { status: 400, headers: CORS_HEADERS });
  }

  const entityType = parts[1]; // 'listing' or 'buyer'
  const entityId = parts[2];
  const action = parts[3] || 'get';

  const namespace = entityType === 'listing' ? env.LISTING_MEMORY : env.BUYER_MEMORY;
  const doId = namespace.idFromName(entityId);
  const stub = namespace.get(doId);

  return stub.fetch(
    new Request(`https://do/${action}`, {
      method: request.method,
      headers: request.headers,
      body: request.method === 'POST' ? request.body : undefined,
    })
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildMemoryContext(
  memory: DurableMemoryState | null,
  type: 'listing' | 'buyer' | null
): string | null {
  if (!memory || memory.conversationHistory.length === 0) return null;

  const entityLabel = type === 'listing' ? 'listing' : 'buyer';
  const recentHistory = memory.conversationHistory.slice(-10);

  let context = `[MEMORY CONTEXT — Prior ${entityLabel} interactions]\n`;

  // Summarize recent actions
  if (memory.actions.length > 0) {
    const recentActions = memory.actions.slice(-5);
    context += `Recent actions taken: ${recentActions.map((a) => a.action).join(', ')}\n`;
  }

  // Workflow state
  const wfKeys = Object.keys(memory.workflowState);
  if (wfKeys.length > 0) {
    context += `Workflow state: ${JSON.stringify(memory.workflowState)}\n`;
  }

  // Recent conversation
  context += `\nRecent conversation:\n`;
  for (const entry of recentHistory) {
    const role = entry.role === 'user' ? 'User' : 'Assistant';
    // Truncate long messages in context
    const content =
      entry.content.length > 300
        ? entry.content.substring(0, 300) + '…'
        : entry.content;
    context += `${role}: ${content}\n`;
  }

  context += `[END MEMORY CONTEXT]\n`;
  return context;
}

function extractContentFromSSE(raw: string): string {
  const lines = raw.split('\n');
  let content = '';
  for (const line of lines) {
    if (!line.startsWith('data: ')) continue;
    const json = line.slice(6).trim();
    if (json === '[DONE]') continue;
    try {
      const parsed = JSON.parse(json);
      const delta = parsed.choices?.[0]?.delta?.content;
      if (delta) content += delta;
    } catch {
      // skip
    }
  }
  return content;
}

function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}
