/**
 * Clozze AI Worker configuration.
 *
 * When VITE_CLOZZE_AI_WORKER_URL is set, all AI assistant requests route
 * through the Cloudflare Worker for memory-enriched orchestration.
 * When unset, requests go directly to Supabase edge functions (legacy path).
 */

export function getAIEndpoint(flow: string = 'task-ai-chat'): string {
  const workerUrl = import.meta.env.VITE_CLOZZE_AI_WORKER_URL;

  if (workerUrl) {
    // Route through Cloudflare Worker
    return `${workerUrl}/ai/chat`;
  }

  // Fallback: direct Supabase edge function
  return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${flow}`;
}

export function isWorkerEnabled(): boolean {
  return !!import.meta.env.VITE_CLOZZE_AI_WORKER_URL;
}

export function getAIHeaders(accessToken?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
    // Also pass as custom header for Worker to forward
    headers['x-supabase-auth'] = `Bearer ${accessToken}`;
  }

  return headers;
}
