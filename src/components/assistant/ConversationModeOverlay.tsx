import { Mic, Loader2, Volume2, Wifi, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ConversationState } from "@/hooks/useConversationMode";
import type { AssistantMessage } from "@/hooks/useTaskAssistant";
import { useEffect, useRef } from "react";

interface ConversationModeOverlayProps {
  state: ConversationState;
  liveTranscript: string;
  onEnd: () => void;
  messages?: AssistantMessage[];
  isLoading?: boolean;
  conversationStartIndex?: number;
}

const STATE_CONFIG: Record<
  ConversationState,
  { label: string; icon: typeof Mic; ringClass: string; innerClass: string; iconClass: string }
> = {
  idle: { label: '', icon: Mic, ringClass: '', innerClass: '', iconClass: '' },
  connecting: {
    label: 'Connecting…',
    icon: Wifi,
    ringClass: 'bg-muted/30 animate-pulse',
    innerClass: 'bg-muted/50',
    iconClass: 'text-muted-foreground animate-pulse',
  },
  listening: {
    label: 'Listening…',
    icon: Mic,
    ringClass: 'bg-primary/10 shadow-[0_0_30px_hsl(var(--primary)/0.15)]',
    innerClass: 'bg-primary/20',
    iconClass: 'text-primary',
  },
  processing: {
    label: 'Thinking…',
    icon: Loader2,
    ringClass: 'bg-muted/20',
    innerClass: 'bg-muted/30',
    iconClass: 'text-muted-foreground animate-spin',
  },
  speaking: {
    label: 'Speaking…',
    icon: Volume2,
    ringClass: 'bg-primary/15 shadow-[0_0_40px_hsl(var(--primary)/0.2)]',
    innerClass: 'bg-primary/25',
    iconClass: 'text-primary',
  },
};

// Max length for a message to be considered "conversational" vs "generated content"
const CONVERSATIONAL_MAX_LENGTH = 600;

export default function ConversationModeOverlay({
  state,
  liveTranscript,
  onEnd,
  messages = [],
  isLoading = false,
  conversationStartIndex = 0,
}: ConversationModeOverlayProps) {
  const config = STATE_CONFIG[state];
  const Icon = config.icon;
  const scrollRef = useRef<HTMLDivElement>(null);

  // Only show messages that arrived during this conversation session
  const conversationMessages = messages.slice(conversationStartIndex);

  // Filter: show user messages always, show assistant messages only if short (conversational)
  // Long generated content stays in the background chat panel
  const displayMessages = conversationMessages.map((msg) => {
    if (msg.role === 'user') return msg;

    // Strip tags for length check
    const cleanLen = msg.content
      .replace(/\[SPOKEN\][\s\S]*?\[\/SPOKEN\]\s*/g, '')
      .replace(/\[FULL\][\s\S]*?\[\/FULL\]\s*/g, '')
      .replace(/\[ACTION:.*?\]/g, '')
      .trim().length;

    if (cleanLen > CONVERSATIONAL_MAX_LENGTH) {
      // Replace with a brief summary card
      return {
        ...msg,
        content: '✅ Content generated — view the full output in the chat panel.',
        _isPlaceholder: true,
      };
    }
    return msg;
  });

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayMessages.length, isLoading]);

  // Strip [SPOKEN]/[FULL] markers for display
  const cleanContent = (content: string) => {
    const fullMatch = content.match(/\[FULL\]\s*([\s\S]*?)(?:\[\/FULL\]|$)/);
    if (fullMatch) return fullMatch[1].trim();
    return content
      .replace(/\[SPOKEN\][\s\S]*?\[\/SPOKEN\]\s*/g, '')
      .replace(/\[ACTION:.*?\]/g, '')
      .trim();
  };

  return (
    <div className="absolute inset-0 z-50 bg-background/98 backdrop-blur-sm flex flex-col">
      {/* Compact header with state indicator */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="relative">
            {state === 'listening' && (
              <div className="absolute inset-0 -m-1 rounded-full bg-primary/10 animate-ping" style={{ animationDuration: '2s' }} />
            )}
            {state === 'speaking' && (
              <div className="absolute inset-0 -m-1 rounded-full border border-primary/20 animate-ping" style={{ animationDuration: '1.5s' }} />
            )}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${config.ringClass}`}>
              <Icon className={`h-4 w-4 transition-colors duration-300 ${config.iconClass}`} />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{config.label}</p>
            {state === 'speaking' && (
              <p className="text-[10px] text-muted-foreground">Speak to interrupt</p>
            )}
            {state === 'listening' && !liveTranscript && (
              <p className="text-[10px] text-muted-foreground">Ask a question or give an instruction</p>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={onEnd}
        >
          <X className="h-3.5 w-3.5" />
          End
        </Button>
      </div>

      {/* Live transcript bar */}
      {state === 'listening' && liveTranscript && (
        <div className="px-4 py-2 bg-primary/5 border-b border-border/30">
          <p className="text-sm text-foreground italic">&ldquo;{liveTranscript}&rdquo;</p>
        </div>
      )}

      {/* Conversation feed — only conversational messages, not generated content */}
      <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef}>
        <div className="space-y-3 max-w-full">
          {displayMessages.length === 0 && !isLoading && (
            <div className="flex items-center justify-center h-32">
              <p className="text-sm text-muted-foreground/60">
                Start speaking — your conversation will appear here
              </p>
            </div>
          )}

          {displayMessages.map((msg, i) => {
            const isPlaceholder = (msg as any)._isPlaceholder;
            return (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[90%] rounded-lg px-3.5 py-2.5 text-sm ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : isPlaceholder
                        ? 'bg-muted/30 text-muted-foreground border border-border/50'
                        : 'bg-muted/50 text-foreground'
                  }`}
                >
                  <p className="leading-relaxed">{cleanContent(msg.content)}</p>
                </div>
              </div>
            );
          })}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted/50 rounded-lg px-3.5 py-2.5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  <span className="animate-pulse">Researching and generating…</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
