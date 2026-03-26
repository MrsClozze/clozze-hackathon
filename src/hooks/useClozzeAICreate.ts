import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAIEndpoint, getAIHeaders, isWorkerEnabled } from "@/lib/aiWorkerConfig";

export type CreationFlow = 'create_task' | 'add_buyer' | 'add_listing';

export interface AICreateMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export type CreateLoadingPhase = 'idle' | 'thinking' | 'researching' | 'generating';

/** Parsed structured data from AI response */
export interface ParsedTaskData {
  title: string;
  priority: "high" | "medium" | "low";
  dueDate: string | null;
  notes: string | null;
  buyerId?: string;
  listingId?: string;
  address?: string;
}

export interface ParsedBuyerData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  preApprovedAmount?: number;
  wantsNeeds?: string;
  preferences?: {
    mustHaves: string[];
    niceToHaves: string[];
    dealbreakers: string[];
    budgetContext: string;
    locationPreferences: string[];
    followUpQuestions: string[];
  };
}

export interface ParsedListingData {
  sellerFirstName?: string;
  sellerLastName?: string;
  sellerEmail?: string;
  sellerPhone?: string;
  address?: string;
  city?: string;
  zipcode?: string;
  county?: string;
  bedrooms?: number;
  bathrooms?: number;
  sqFeet?: number;
  listingPrice?: number;
  description?: string;
  highlights?: string[];
  missingFields?: string[];
  researchSuggestions?: string[];
}

export function extractStructuredData(content: string, flow: CreationFlow): {
  tasks?: ParsedTaskData[];
  buyer?: ParsedBuyerData;
  listing?: ParsedListingData;
} {
  const result: ReturnType<typeof extractStructuredData> = {};

  if (flow === 'create_task') {
    const match = content.match(/```json-tasks\s*([\s\S]*?)```/);
    if (match) {
      try {
        const parsed = JSON.parse(match[1].trim());
        if (Array.isArray(parsed)) {
          result.tasks = parsed.map(t => ({
            title: t.title || '',
            priority: ['high', 'medium', 'low'].includes(t.priority) ? t.priority : 'medium',
            dueDate: t.dueDate || null,
            notes: t.notes || null,
            buyerId: t.buyerId || undefined,
            listingId: t.listingId || undefined,
            address: t.address || undefined,
          }));
        }
      } catch { /* parse error, ignore */ }
    }
  }

  if (flow === 'add_buyer') {
    const match = content.match(/```json-buyer\s*([\s\S]*?)```/);
    if (match) {
      try {
        result.buyer = JSON.parse(match[1].trim());
      } catch { /* parse error */ }
    }
  }

  if (flow === 'add_listing') {
    const match = content.match(/```json-listing\s*([\s\S]*?)```/);
    if (match) {
      try {
        result.listing = JSON.parse(match[1].trim());
      } catch { /* parse error */ }
    }
  }

  return result;
}

interface UseClozzeAICreateOptions {
  flow: CreationFlow;
  existingFormData?: Record<string, any>;
  listingId?: string;
  buyerId?: string;
}

export function useClozzeAICreate({ flow, existingFormData, listingId, buyerId }: UseClozzeAICreateOptions) {
  const [messages, setMessages] = useState<AICreateMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<CreateLoadingPhase>('idle');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || isLoading) return;

    setError(null);
    const userMessage: AICreateMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: message.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Detect research/address intent client-side for immediate UI feedback
    const lowerMsg = message.toLowerCase();
    const researchPhrases = [
      'research', 'look up', 'look this up', 'find the details', 'pull the info',
      'pull info', 'search for', 'find out', 'get the details', 'get details',
      'do some research', 'can you research', 'grab the info', 'check on',
      'what can you find', 'look into', 'dig up',
    ];
    const hasResearch = flow === 'add_listing' && researchPhrases.some(p => lowerMsg.includes(p));
    // Also detect address presence — triggers auto-research on backend
    const hasAddress = flow === 'add_listing' && /\d+\s+\w+\s+(?:street|st|avenue|ave|boulevard|blvd|drive|dr|road|rd|lane|ln|way|court|ct|circle|cir|place|pl|terrace|ter)/i.test(message);
    const willResearch = hasResearch || hasAddress;

    setLoadingPhase(willResearch ? 'researching' : 'thinking');

    const assistantMessageId = crypto.randomUUID();
    let assistantContent = "";

    setMessages(prev => [
      ...prev,
      { id: assistantMessageId, role: "assistant", content: "", timestamp: new Date() },
    ]);

    try {
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const accessToken = (await supabase.auth.getSession()).data.session?.access_token;

      const requestBody: Record<string, unknown> = {
        flow,
        message: message.trim(),
        conversationHistory,
        existingFormData,
      };

      // Route through Worker when enabled for memory-enriched context
      if (isWorkerEnabled()) {
        if (listingId) requestBody.listingId = listingId;
        if (buyerId) requestBody.buyerId = buyerId;
        requestBody.flow = 'clozze-ai-create';
      }

      const response = await fetch(
        getAIEndpoint('clozze-ai-create'),
        {
          method: "POST",
          headers: getAIHeaders(accessToken),
          body: JSON.stringify(requestBody),
          signal: abortController.signal,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
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

            if (parsed.metadata && !metadataProcessed) {
              metadataProcessed = true;
              setSuggestions(parsed.metadata.suggestions || []);
              // If research was done, briefly show researching phase before generating
              if (parsed.metadata.usedResearch) {
                setLoadingPhase('generating');
              } else {
                setLoadingPhase('generating');
              }
              continue;
            }

            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
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
      console.error("Clozze AI create error:", err);
      setError(err.message || "Failed to get response");
      if (!assistantContent) {
        setMessages(prev => prev.filter(m => m.id !== assistantMessageId));
      }
    } finally {
      setIsLoading(false);
      setLoadingPhase('idle');
      abortControllerRef.current = null;
    }
  }, [flow, existingFormData, messages, isLoading]);

  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      setLoadingPhase('idle');
    }
  }, []);

  const clearConversation = useCallback(() => {
    setMessages([]);
    setError(null);
    setSuggestions([]);
    setLoadingPhase('idle');
  }, []);

  /** Extract structured data from the latest assistant message */
  const getLatestStructuredData = useCallback(() => {
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant' && m.content);
    if (!lastAssistant) return {};
    return extractStructuredData(lastAssistant.content, flow);
  }, [messages, flow]);

  return {
    messages,
    isLoading,
    loadingPhase,
    suggestions,
    error,
    sendMessage,
    cancelStream,
    clearConversation,
    getLatestStructuredData,
  };
}
