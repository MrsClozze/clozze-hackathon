import { DurableMemoryState, MemoryEntry, CORS_HEADERS } from './types';

const MAX_HISTORY = 50; // Keep last 50 exchanges per entity
const MAX_ACTIONS = 100;

/**
 * Base Durable Object class for entity memory (listing or buyer).
 * Stores conversation history, actions taken, and lightweight workflow state.
 */
export class EntityMemory implements DurableObject {
  private state: DurableObjectState;
  private memory: DurableMemoryState | null = null;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  private async load(): Promise<DurableMemoryState> {
    if (this.memory) return this.memory;
    const stored = await this.state.storage.get<DurableMemoryState>('memory');
    this.memory = stored ?? {
      conversationHistory: [],
      actions: [],
      workflowState: {},
      lastAccessed: Date.now(),
    };
    return this.memory;
  }

  private async save(): Promise<void> {
    if (this.memory) {
      await this.state.storage.put('memory', this.memory);
    }
  }

  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    try {
      if (url.pathname === '/get' && request.method === 'GET') {
        return this.handleGet();
      }
      if (url.pathname === '/append' && request.method === 'POST') {
        return this.handleAppend(request);
      }
      if (url.pathname === '/update-workflow' && request.method === 'POST') {
        return this.handleUpdateWorkflow(request);
      }
      if (url.pathname === '/clear' && request.method === 'POST') {
        return this.handleClear();
      }

      return new Response('Not found', { status: 404, headers: CORS_HEADERS });
    } catch (err) {
      console.error('EntityMemory error:', err);
      return new Response(JSON.stringify({ error: 'Internal memory error' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
  }

  private async handleGet(): Promise<Response> {
    const mem = await this.load();
    mem.lastAccessed = Date.now();
    await this.save();

    return new Response(JSON.stringify(mem), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  private async handleAppend(request: Request): Promise<Response> {
    const body = await request.json() as {
      entries: MemoryEntry[];
      actions?: { action: string; details?: string }[];
    };

    const mem = await this.load();

    // Append conversation entries
    for (const entry of body.entries) {
      mem.conversationHistory.push({
        ...entry,
        timestamp: entry.timestamp || Date.now(),
      });
    }

    // Trim to max history
    if (mem.conversationHistory.length > MAX_HISTORY) {
      mem.conversationHistory = mem.conversationHistory.slice(-MAX_HISTORY);
    }

    // Append actions
    if (body.actions) {
      for (const action of body.actions) {
        mem.actions.push({ ...action, timestamp: Date.now() });
      }
      if (mem.actions.length > MAX_ACTIONS) {
        mem.actions = mem.actions.slice(-MAX_ACTIONS);
      }
    }

    mem.lastAccessed = Date.now();
    await this.save();

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  private async handleUpdateWorkflow(request: Request): Promise<Response> {
    const updates = await request.json() as Record<string, unknown>;
    const mem = await this.load();
    mem.workflowState = { ...mem.workflowState, ...updates };
    mem.lastAccessed = Date.now();
    await this.save();

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  private async handleClear(): Promise<Response> {
    this.memory = {
      conversationHistory: [],
      actions: [],
      workflowState: {},
      lastAccessed: Date.now(),
    };
    await this.save();

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
}

/** Durable Object for listing-specific memory */
export class ListingMemory extends EntityMemory {
  constructor(state: DurableObjectState) {
    super(state);
  }
}

/** Durable Object for buyer-specific memory */
export class BuyerMemory extends EntityMemory {
  constructor(state: DurableObjectState) {
    super(state);
  }
}
