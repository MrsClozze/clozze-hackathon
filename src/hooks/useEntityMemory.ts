import { useState, useEffect, useCallback, useRef } from 'react';
import { isWorkerEnabled } from '@/lib/aiWorkerConfig';

export interface PendingAction {
  action: string;
  details?: string;
  timestamp: number;
  status: 'pending' | 'completed' | 'failed';
}

interface MemorySnapshot {
  pendingActions: PendingAction[];
  completedCount: number;
  failedCount: number;
  lastAccessed: number;
}

/**
 * Hook to fetch pending actions from the Cloudflare Worker's Durable Object memory.
 * Used to surface "what's still open" in the UI outside of chat.
 */
export function useEntityMemory(entityType: 'listing' | 'buyer' | null, entityId: string | null) {
  const [snapshot, setSnapshot] = useState<MemorySnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMemory = useCallback(async () => {
    if (!entityType || !entityId || !isWorkerEnabled()) {
      setSnapshot(null);
      return;
    }

    const workerUrl = import.meta.env.VITE_CLOZZE_AI_WORKER_URL;
    if (!workerUrl) return;

    try {
      setIsLoading(true);
      const res = await fetch(`${workerUrl}/memory/${entityType}/${entityId}/get`);
      if (!res.ok) return;

      const data = await res.json();
      const actions = data.actions || [];

      setSnapshot({
        pendingActions: actions.filter((a: PendingAction) => a.status === 'pending'),
        completedCount: actions.filter((a: PendingAction) => a.status === 'completed').length,
        failedCount: actions.filter((a: PendingAction) => a.status === 'failed').length,
        lastAccessed: data.lastAccessed || 0,
      });
    } catch (err) {
      console.error('Failed to fetch entity memory:', err);
    } finally {
      setIsLoading(false);
    }
  }, [entityType, entityId]);

  // Fetch on mount and poll every 30s
  useEffect(() => {
    fetchMemory();
    intervalRef.current = setInterval(fetchMemory, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchMemory]);

  const refresh = useCallback(() => {
    fetchMemory();
  }, [fetchMemory]);

  return { snapshot, isLoading, refresh };
}
