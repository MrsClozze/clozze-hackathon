import { useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, User, Globe, Copy, Save, Loader2, ListTodo, FileText, Search, Database, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { parseResponseActions } from "@/lib/taskTypeConfigs";
import type { AssistantMessage, LoadingPhase } from "@/hooks/useTaskAssistant";

interface TaskAssistantChatProps {
  messages: AssistantMessage[];
  isLoading: boolean;
  isResearching?: boolean;
  loadingPhase?: LoadingPhase;
  researchSources: { title: string; url: string }[];
  autoContextMessage?: string;
  onSaveToNotes?: (content: string) => void;
  onCreateTasks?: (content: string) => void;
}

const PHASE_DISPLAY: Record<LoadingPhase, { icon: typeof Database; label: string; className: string }> = {
  context: {
    icon: Database,
    label: 'Analyzing Clozze context…',
    className: 'text-muted-foreground',
  },
  research: {
    icon: Search,
    label: 'Researching external data…',
    className: 'text-primary',
  },
  generating: {
    icon: Sparkles,
    label: 'Generating response…',
    className: 'text-primary',
  },
  idle: {
    icon: Loader2,
    label: '',
    className: 'text-muted-foreground',
  },
};

export default function TaskAssistantChat({
  messages,
  isLoading,
  isResearching,
  loadingPhase = 'idle',
  researchSources,
  autoContextMessage,
  onSaveToNotes,
  onCreateTasks,
}: TaskAssistantChatProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loadingPhase]);

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({ title: "Copied", description: "Content copied to clipboard." });
  };

  // Auto-context empty state with contextual message
  if (messages.length === 0 && autoContextMessage) {
    return (
      <ScrollArea className="flex-1">
        <div className="p-4">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mt-1">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="max-w-[85%] rounded-lg px-3 py-2 text-sm bg-muted/50 border border-border">
              <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {autoContextMessage}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    );
  }

  // Fallback empty state
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Bot className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Clozze AI Ready</p>
            <p className="text-xs text-muted-foreground mt-1">
              Ask me anything about this task, or use a suggestion below.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1" ref={scrollRef as any}>
      <div className="p-4 space-y-4">
        {messages.map((msg) => {
          const actions = msg.role === "assistant" && msg.content && !isLoading
            ? parseResponseActions(msg.content)
            : [];

          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mt-1">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 border border-border"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div className="space-y-2">
                    <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content || (isLoading ? "..." : "")}
                      </ReactMarkdown>
                    </div>
                    {msg.content && !isLoading && (
                      <div className="flex flex-wrap gap-1 pt-1 border-t border-border/50">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => handleCopy(msg.content)}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </Button>
                        {actions.map((action, i) => (
                          <Button
                            key={`${action.type}-${i}`}
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              if (action.type === 'save_notes' || action.type === 'save_draft') {
                                onSaveToNotes?.(action.content);
                              } else if (action.type === 'create_tasks') {
                                onCreateTasks?.(action.content);
                              } else if (action.type === 'copy_text') {
                                handleCopy(action.content);
                              }
                            }}
                          >
                            {action.type === 'create_tasks' && <ListTodo className="h-3 w-3 mr-1" />}
                            {action.type === 'save_draft' && <FileText className="h-3 w-3 mr-1" />}
                            {action.type === 'save_notes' && <Save className="h-3 w-3 mr-1" />}
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p>{msg.content}</p>
                )}
              </div>
              {msg.role === "user" && (
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center mt-1">
                  <User className="h-4 w-4 text-accent-foreground" />
                </div>
              )}
            </div>
          );
        })}

        {/* Three-phase loading indicator */}
        {isLoading && loadingPhase !== 'idle' && (
          <div className="flex items-center gap-2 text-xs pl-10">
            {(() => {
              const phase = PHASE_DISPLAY[loadingPhase];
              const Icon = phase.icon;
              return (
                <>
                  <Icon className={`h-3 w-3 ${loadingPhase === 'context' ? 'animate-spin' : 'animate-pulse'} ${phase.className}`} />
                  <span className={phase.className}>{phase.label}</span>
                </>
              );
            })()}
          </div>
        )}

        {/* Fallback loading when phase is idle but still loading */}
        {isLoading && loadingPhase === 'idle' && messages[messages.length - 1]?.role === "assistant" && !messages[messages.length - 1]?.content && (
          <div className="flex items-center gap-2 text-muted-foreground text-xs pl-10">
            <Loader2 className="h-3 w-3 animate-spin" />
            Preparing…
          </div>
        )}

        {researchSources.length > 0 && (
          <div className="pl-10">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Globe className="h-3 w-3" />
              <span>Sources used</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {researchSources.map((source, i) => (
                <a
                  key={i}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors truncate max-w-[200px]"
                  title={source.title}
                >
                  {source.title}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
