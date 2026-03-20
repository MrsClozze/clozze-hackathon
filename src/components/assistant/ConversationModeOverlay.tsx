import { Mic, Loader2, Volume2, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ConversationState } from "@/hooks/useConversationMode";

interface ConversationModeOverlayProps {
  state: ConversationState;
  liveTranscript: string;
  onEnd: () => void;
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

export default function ConversationModeOverlay({
  state,
  liveTranscript,
  onEnd,
}: ConversationModeOverlayProps) {
  const config = STATE_CONFIG[state];
  const Icon = config.icon;

  return (
    <div className="absolute inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center px-6">
      {/* Animated ring indicator */}
      <div className="relative">
        {/* Outer pulse ring — only when listening */}
        {state === 'listening' && (
          <div className="absolute inset-0 -m-3 rounded-full bg-primary/5 animate-ping" style={{ animationDuration: '2s' }} />
        )}

        {/* Speaking waveform rings */}
        {state === 'speaking' && (
          <>
            <div className="absolute inset-0 -m-4 rounded-full border border-primary/20 animate-ping" style={{ animationDuration: '1.5s' }} />
            <div className="absolute inset-0 -m-8 rounded-full border border-primary/10 animate-ping" style={{ animationDuration: '2s' }} />
          </>
        )}

        <div
          className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 ${config.ringClass}`}
        >
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${config.innerClass}`}
          >
            <Icon className={`h-7 w-7 transition-colors duration-300 ${config.iconClass}`} />
          </div>
        </div>
      </div>

      {/* State label */}
      <p className="mt-5 text-sm font-medium text-foreground">
        {config.label}
      </p>

      {/* Live transcript */}
      {state === 'listening' && liveTranscript && (
        <p className="mt-3 text-sm text-muted-foreground max-w-[85%] text-center italic">
          &ldquo;{liveTranscript}&rdquo;
        </p>
      )}

      {/* Hint text */}
      {state === 'listening' && !liveTranscript && (
        <p className="mt-3 text-xs text-muted-foreground/60">
          Ask a question or give an instruction
        </p>
      )}

      {state === 'speaking' && (
        <p className="mt-3 text-xs text-muted-foreground/60">
          Speak to interrupt
        </p>
      )}

      {/* End conversation */}
      <Button
        variant="outline"
        size="sm"
        className="mt-8 px-6"
        onClick={onEnd}
      >
        End Conversation
      </Button>
    </div>
  );
}
