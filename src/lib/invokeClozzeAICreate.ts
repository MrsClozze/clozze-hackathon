import { supabase } from "@/integrations/supabase/client";

export type ClozzeCreateFlow = "create_task" | "add_buyer" | "add_listing" | "buyer" | "listing" | "task";

export interface ClozzeCreateMetadata {
  flow?: string;
  suggestions?: string[];
  usedResearch?: boolean;
  researchAddress?: string | null;
  needsAddress?: boolean;
}

interface InvokeClozzeAICreateArgs {
  flow: ClozzeCreateFlow;
  message: string;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  existingFormData?: Record<string, unknown>;
}

export async function invokeClozzeAICreate({
  flow,
  message,
  conversationHistory,
  existingFormData,
}: InvokeClozzeAICreateArgs): Promise<{ content: string; metadata: ClozzeCreateMetadata | null }> {
  const session = await supabase.auth.getSession();
  const accessToken = session.data.session?.access_token;

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/clozze-ai-create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({
      flow,
      message,
      conversationHistory,
      existingFormData,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 429) {
      throw new Error("Rate limited. Please wait a moment and try again.");
    }
    if (response.status === 402) {
      throw new Error("AI credits exhausted. Please add credits to continue.");
    }
    throw new Error(errorData.error || "Failed to generate AI response");
  }

  if (!response.body) {
    throw new Error("No response body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  let metadata: ClozzeCreateMetadata | null = null;

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

        if (parsed.metadata) {
          metadata = parsed.metadata;
          continue;
        }

        const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (delta) content += delta;
      } catch {
        buffer = line + "\n" + buffer;
        break;
      }
    }
  }

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
        if (parsed.metadata) {
          metadata = parsed.metadata;
          continue;
        }

        const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (delta) content += delta;
      } catch {
        // Ignore partial leftovers on final flush
      }
    }
  }

  return { content: content.trim(), metadata };
}
