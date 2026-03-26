import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAIEndpoint, getAIHeaders, isWorkerEnabled } from "@/lib/aiWorkerConfig";

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  metadata?: {
    taskType?: string;
    suggestedActions?: string[];
    usedResearch?: boolean;
    researchSources?: { title: string; url: string }[];
  };
  timestamp: Date;
}

export type LoadingPhase = 'idle' | 'context' | 'research' | 'generating';

interface UseTaskAssistantOptions {
  taskId: string;
  listingId?: string;
  buyerId?: string;
}

export function useTaskAssistant({ taskId, listingId, buyerId }: UseTaskAssistantOptions) {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>('idle');
  const [isResearching, setIsResearching] = useState(false);
  const [suggestedActions, setSuggestedActions] = useState<string[]>([]);
  const [researchSources, setResearchSources] = useState<{ title: string; url: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (message: string, opts?: { conversational?: boolean }) => {
    if (!message.trim() || isLoading) return;

    setError(null);

    const userMessage: AssistantMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: message.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setLoadingPhase('context');

    const assistantMessageId = crypto.randomUUID();
    let assistantContent = "";

    // Add empty assistant message for streaming
    setMessages(prev => [
      ...prev,
      {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      },
    ]);

    try {
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const accessToken = (await supabase.auth.getSession()).data.session?.access_token;

      const requestBody: Record<string, unknown> = {
        taskId,
        message: message.trim(),
        conversationHistory,
        ...(opts?.conversational ? { conversational: true } : {}),
      };

      // When Worker is enabled, include entity IDs and flow for orchestration
      if (isWorkerEnabled()) {
        if (listingId) requestBody.listingId = listingId;
        if (buyerId) requestBody.buyerId = buyerId;
        requestBody.flow = 'task-ai-chat';
      }

      const response = await fetch(
        getAIEndpoint('task-ai-chat'),
        {
          method: "POST",
          headers: getAIHeaders(accessToken),
          body: JSON.stringify(requestBody),
          signal: abortController.signal,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 429) {
          throw new Error("Rate limited. Please wait a moment and try again.");
        }
        if (response.status === 402) {
          throw new Error("AI credits exhausted. Please add credits to continue.");
        }
        throw new Error(errorData.error || "Failed to get AI response");
      }

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let metadataProcessed = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") continue;

          try {
            const parsed = JSON.parse(jsonStr);

            // Handle metadata event — arrives after context fetch, before LLM streaming
            if (parsed.metadata && !metadataProcessed) {
              metadataProcessed = true;
              setSuggestedActions(parsed.metadata.suggestedActions || []);
              if (parsed.metadata.researchSources) {
                setResearchSources(parsed.metadata.researchSources);
              }
              // Transition phase based on whether research was done
              if (parsed.metadata.usedResearch) {
                setIsResearching(true);
                setLoadingPhase('research');
                // Brief pause to show research phase before generating
                setTimeout(() => {
                  if (abortControllerRef.current) setLoadingPhase('generating');
                }, 800);
              } else {
                setLoadingPhase('generating');
              }
              continue;
            }

            // Handle regular content delta
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              setIsResearching(false);
              setLoadingPhase('generating');
              assistantContent += content;
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantMessageId
                    ? { ...m, content: assistantContent }
                    : m
                )
              );
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Final flush
      if (buffer.trim()) {
        for (let raw of buffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantMessageId
                    ? { ...m, content: assistantContent }
                    : m
                )
              );
            }
          } catch { /* ignore */ }
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      console.error("Task assistant error:", err);
      setError(err.message || "Failed to get response");
      if (!assistantContent) {
        setMessages(prev => prev.filter(m => m.id !== assistantMessageId));
      }
    } finally {
      setIsLoading(false);
      setIsResearching(false);
      setLoadingPhase('idle');
      abortControllerRef.current = null;
    }
  }, [taskId, listingId, buyerId, messages, isLoading]);

  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      setIsResearching(false);
      setLoadingPhase('idle');
    }
  }, []);

  const clearConversation = useCallback(() => {
    setMessages([]);
    setError(null);
    setResearchSources([]);
    setSuggestedActions([]);
    setLoadingPhase('idle');
  }, []);

  const executeAction = useCallback(async (action: string, payload: any) => {
    try {
      const { data, error } = await supabase.functions.invoke("task-ai-action", {
        body: { taskId, action, payload },
      });
      if (error) throw error;
      return data;
    } catch (err: any) {
      console.error("Action execution error:", err);
      throw err;
    }
  }, [taskId]);

  return {
    messages,
    isLoading,
    isResearching,
    loadingPhase,
    suggestedActions,
    researchSources,
    error,
    sendMessage,
    cancelStream,
    clearConversation,
    executeAction,
  };
}
