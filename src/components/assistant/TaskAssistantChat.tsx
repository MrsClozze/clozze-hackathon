import { useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, User, Globe, Copy, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import type { AssistantMessage } from "@/hooks/useTaskAssistant";

interface TaskAssistantChatProps {
  messages: AssistantMessage[];
  isLoading: boolean;
  researchSources: { title: string; url: string }[];
  onSaveToNotes?: (content: string) => void;
}

export default function TaskAssistantChat({
  messages,
  isLoading,
  researchSources,
  onSaveToNotes,
}: TaskAssistantChatProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({ title: "Copied", description: "Content copied to clipboard." });
  };

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Bot className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Task Assistant Ready</p>
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
        {messages.map((msg) => (
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
                    <div className="flex gap-1 pt-1 border-t border-border/50">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => handleCopy(msg.content)}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </Button>
                      {onSaveToNotes && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => onSaveToNotes(msg.content)}
                        >
                          <Save className="h-3 w-3 mr-1" />
                          Save to Notes
                        </Button>
                      )}
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
        ))}

        {isLoading && messages[messages.length - 1]?.role === "assistant" && !messages[messages.length - 1]?.content && (
          <div className="flex items-center gap-2 text-muted-foreground text-xs pl-10">
            <Loader2 className="h-3 w-3 animate-spin" />
            Thinking...
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
