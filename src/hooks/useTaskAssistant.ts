import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

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

interface UseTaskAssistantOptions {
  taskId: string;
}

export function useTaskAssistant({ taskId }: UseTaskAssistantOptions) {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const [suggestedActions, setSuggestedActions] = useState<string[]>([]);
  const [researchSources, setResearchSources] = useState<{ title: string; url: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (message: string) => {
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

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/task-ai-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            taskId,
            message: message.trim(),
            conversationHistory,
          }),
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

            // Handle metadata event
            if (parsed.metadata && !metadataProcessed) {
              metadataProcessed = true;
              setSuggestedActions(parsed.metadata.suggestedActions || []);
              if (parsed.metadata.researchSources) {
                setResearchSources(parsed.metadata.researchSources);
              }
              // Set researching state based on metadata
              if (parsed.metadata.usedResearch) {
                setIsResearching(true);
              }
              continue;
            }

            // Handle regular content delta
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              // Once content starts flowing, research is done
              if (isResearching) setIsResearching(false);
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
            // Incomplete JSON, put back
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
      // Remove empty assistant message on error
      if (!assistantContent) {
        setMessages(prev => prev.filter(m => m.id !== assistantMessageId));
      }
    } finally {
      setIsLoading(false);
      setIsResearching(false);
      abortControllerRef.current = null;
    }
  }, [taskId, messages, isLoading, isResearching]);

  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      setIsResearching(false);
    }
  }, []);

  const clearConversation = useCallback(() => {
    setMessages([]);
    setError(null);
    setResearchSources([]);
    setSuggestedActions([]);
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
    suggestedActions,
    researchSources,
    error,
    sendMessage,
    cancelStream,
    clearConversation,
    executeAction,
  };
}
