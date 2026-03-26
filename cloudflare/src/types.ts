export interface Env {
  LISTING_MEMORY: DurableObjectNamespace;
  BUYER_MEMORY: DurableObjectNamespace;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

export interface AIRequest {
  message: string;
  taskId?: string;
  listingId?: string;
  buyerId?: string;
  conversationHistory?: { role: string; content: string }[];
  conversational?: boolean;
  flow?: string; // 'task-ai-chat' | 'clozze-ai-create'
  flowData?: Record<string, unknown>;
  existingFormData?: Record<string, unknown>;
}

export interface MemoryEntry {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  actions?: string[];
}

export interface ActionRecord {
  action: string;
  timestamp: number;
  details?: string;
  status: 'pending' | 'completed' | 'failed';
}

export interface DurableMemoryState {
  conversationHistory: MemoryEntry[];
  actions: ActionRecord[];
  workflowState: Record<string, unknown>;
  lastAccessed: number;
}

export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-supabase-auth',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
