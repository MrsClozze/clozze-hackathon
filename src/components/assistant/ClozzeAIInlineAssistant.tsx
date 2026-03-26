import { useState, useRef, useEffect, useMemo } from "react";
import { Zap, Send, Mic, MicOff, Square, Trash2, ChevronDown, ChevronUp, Loader2, Sparkles, Bot, User, Copy, Check, ArrowDownToLine, Volume2, VolumeX, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { useTaskVoice } from "@/hooks/useTaskVoice";
import { useClozzeAICreate, extractStructuredData } from "@/hooks/useClozzeAICreate";
import { normalizeMarkdownSpacing } from "@/lib/taskTypeConfigs";
import type { CreationFlow, ParsedTaskData, ParsedBuyerData, ParsedListingData, CreateLoadingPhase } from "@/hooks/useClozzeAICreate";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ClozzeAIInlineAssistantProps {
  flow: CreationFlow;
  existingFormData?: Record<string, any>;
  onApplyTasks?: (tasks: ParsedTaskData[]) => void;
  onApplyBuyer?: (buyer: ParsedBuyerData) => void;
  onApplyListing?: (listing: ParsedListingData) => void;
}

const FLOW_LABELS: Record<CreationFlow, { title: string; placeholder: string; icon: string }> = {
  create_task: {
    title: 'Task Creator',
    placeholder: 'Describe the tasks you need...',
    icon: '📋',
  },
  add_buyer: {
    title: 'Buyer Setup',
    placeholder: 'Describe the buyer and their preferences...',
    icon: '🤝',
  },
  add_listing: {
    title: 'Listing Setup',
    placeholder: 'Describe the property and listing details...',
    icon: '🏠',
  },
};

export default function ClozzeAIInlineAssistant({
  flow,
  existingFormData,
  onApplyTasks,
  onApplyBuyer,
  onApplyListing,
}: ClozzeAIInlineAssistantProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [applied, setApplied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevFlowRef = useRef(flow);
  const prevFormDataRef = useRef(existingFormData);
  const { toast } = useToast();

  const {
    messages,
    isLoading,
    loadingPhase,
    suggestions,
    error,
    sendMessage,
    cancelStream,
    clearConversation,
    getLatestStructuredData,
  } = useClozzeAICreate({ flow, existingFormData });

  const {
    isRecording,
    isPlayingAudio,
    transcript,
    setTranscript,
    startRecording,
    stopRecording,
    playResponse,
    stopPlayback,
  } = useTaskVoice();

  const flowLabel = FLOW_LABELS[flow];

  // Reset conversation when flow changes (context isolation)
  useEffect(() => {
    if (prevFlowRef.current !== flow) {
      clearConversation();
      setInput("");
      setApplied(false);
      setIsExpanded(false);
      prevFlowRef.current = flow;
    }
  }, [flow, clearConversation]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // When recording stops, populate input
  useEffect(() => {
    if (!isRecording && transcript) {
      setInput(transcript);
      setTranscript("");
    }
  }, [isRecording, transcript, setTranscript]);

  // Show error toast
  useEffect(() => {
    if (error) {
      toast({ title: "Clozze AI Error", description: error, variant: "destructive" });
    }
  }, [error, toast]);

  // Reset applied state when messages change
  useEffect(() => {
    setApplied(false);
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    sendMessage(text);
    setInput("");
    if (!isExpanded) setIsExpanded(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleMicToggle = () => {
    if (isRecording) {
      const finalTranscript = stopRecording();
      if (finalTranscript) setInput(finalTranscript);
    } else {
      startRecording();
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({ title: "Copied", description: "Content copied to clipboard." });
  };

  const handleApplyToForm = () => {
    const data = getLatestStructuredData();
    if (flow === 'create_task' && data.tasks?.length && onApplyTasks) {
      onApplyTasks(data.tasks);
      setApplied(true);
      toast({ title: "Applied", description: `${data.tasks.length} task(s) ready for review.` });
    } else if (flow === 'add_buyer' && data.buyer && onApplyBuyer) {
      onApplyBuyer(data.buyer);
      setApplied(true);
      toast({ title: "Applied", description: "Buyer details applied to form." });
    } else if (flow === 'add_listing' && data.listing && onApplyListing) {
      onApplyListing(data.listing);
      setApplied(true);
      toast({ title: "Applied", description: "Listing details applied to form." });
    } else {
      toast({ title: "No data to apply", description: "AI hasn't generated structured data yet.", variant: "destructive" });
    }
  };

  // Check if latest message has structured data
  const hasStructuredData = useMemo(() => {
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant' && m.content);
    if (!lastAssistant) return false;
    const data = extractStructuredData(lastAssistant.content, flow);
    return !!(data.tasks?.length || data.buyer || data.listing);
  }, [messages, flow]);

  // Strip JSON code blocks from display content for cleaner rendering
  const cleanContent = (content: string) => {
    return normalizeMarkdownSpacing(
      content
        .replace(/```json-tasks[\s\S]*?```/g, '')
        .replace(/```json-buyer[\s\S]*?```/g, '')
        .replace(/```json-listing[\s\S]*?```/g, '')
        .trim()
    );
  };

  return (
    <div className="border border-primary/20 rounded-lg bg-primary/5 overflow-hidden">
      {/* Collapsed Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-primary/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
            <Zap className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-sm font-medium text-foreground">
            Clozze AI — {flowLabel.icon} {flowLabel.title}
          </span>
          {isPlayingAudio && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary/10">
              <div className="flex gap-0.5 items-end h-2.5">
                <div className="w-0.5 h-1 bg-primary animate-pulse rounded-full" />
                <div className="w-0.5 h-1.5 bg-primary animate-pulse rounded-full" style={{ animationDelay: '150ms' }} />
                <div className="w-0.5 h-2.5 bg-primary animate-pulse rounded-full" style={{ animationDelay: '300ms' }} />
                <div className="w-0.5 h-1.5 bg-primary animate-pulse rounded-full" style={{ animationDelay: '150ms' }} />
              </div>
            </div>
          )}
          {isRecording && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-destructive/10">
              <div className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
              <span className="text-[10px] text-destructive font-medium">Listening</span>
            </div>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-primary/20">
          {/* Messages */}
          {messages.length > 0 && (
            <ScrollArea className="max-h-[300px]" ref={scrollRef as any}>
              <div className="p-3 space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.role === "assistant" && (
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                        <Bot className="h-3.5 w-3.5 text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[92%] rounded-lg px-4 py-3 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-background border border-border"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_br]:hidden">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {cleanContent(msg.content) || (isLoading ? "..." : "")}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p>{msg.content}</p>
                      )}
                    </div>
                    {msg.role === "user" && (
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center mt-0.5">
                        <User className="h-3.5 w-3.5 text-accent-foreground" />
                      </div>
                    )}
                  </div>
                ))}

                {/* Loading indicator */}
                {isLoading && loadingPhase !== 'idle' && (
                  <div className="flex items-center gap-2 text-xs pl-8">
                    {loadingPhase === 'researching' ? (
                      <>
                        <Globe className="h-3 w-3 animate-pulse text-primary" />
                        <span className="text-primary">Researching property & building listing…</span>
                      </>
                    ) : loadingPhase === 'thinking' ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                        <span className="text-muted-foreground">Analyzing your request…</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3 animate-pulse text-primary" />
                        <span className="text-primary">Generating response…</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          {/* Action buttons when assistant has responded */}
          {messages.some(m => m.role === 'assistant' && m.content) && !isLoading && (
            <div className="px-3 py-2 border-t border-primary/10 bg-primary/5 flex flex-wrap gap-2">
              {hasStructuredData && (
                <Button
                  type="button"
                  size="sm"
                  variant={applied ? "outline" : "default"}
                  className="h-7 text-xs gap-1"
                  onClick={handleApplyToForm}
                  disabled={applied}
                >
                  {applied ? (
                    <>
                      <Check className="h-3 w-3" />
                      Applied
                    </>
                  ) : (
                    <>
                      <ArrowDownToLine className="h-3 w-3" />
                      Apply to Form
                    </>
                  )}
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 text-xs gap-1 text-muted-foreground"
                onClick={() => {
                  const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
                  if (lastAssistant) {
                    if (isPlayingAudio) {
                      stopPlayback();
                    } else {
                      playResponse(cleanContent(lastAssistant.content));
                    }
                  }
                }}
              >
                {isPlayingAudio ? (
                  <>
                    <VolumeX className="h-3 w-3" />
                    Stop
                  </>
                ) : (
                  <>
                    <Volume2 className="h-3 w-3" />
                    Listen
                  </>
                )}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 text-xs gap-1 text-muted-foreground"
                onClick={() => {
                  const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
                  if (lastAssistant) handleCopy(lastAssistant.content);
                }}
              >
                <Copy className="h-3 w-3" />
                Copy
              </Button>
            </div>
          )}

          {/* Suggestions */}
          {messages.length === 0 && suggestions.length === 0 && (
            <div className="px-3 py-2 border-t border-primary/10">
              <div className="flex flex-wrap gap-1.5">
                {(FLOW_LABELS[flow] ? getDefaultSuggestions(flow) : []).map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => { setInput(s); if (!isExpanded) setIsExpanded(true); }}
                    className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border border-primary/20 bg-background text-primary hover:bg-primary/10 hover:border-primary/30 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {suggestions.length > 0 && messages.length <= 1 && (
            <div className="px-3 py-2 border-t border-primary/10">
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => sendMessage(s)}
                    disabled={isLoading}
                    className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border border-primary/20 bg-background text-primary hover:bg-primary/10 hover:border-primary/30 transition-colors disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-2 border-t border-primary/10">
            {isRecording && (
              <div className="flex items-center gap-2 mb-2 px-2 py-1 bg-destructive/10 rounded-md">
                <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                <span className="text-xs text-destructive">Listening...</span>
                {transcript && <span className="text-xs text-muted-foreground truncate flex-1">{transcript}</span>}
              </div>
            )}
            <div className="flex gap-1.5 items-end">
              <Textarea
                value={isRecording ? transcript : input}
                onChange={(e) => !isRecording && setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={flowLabel.placeholder}
                disabled={isLoading}
                className="min-h-[36px] max-h-[80px] resize-none text-sm flex-1"
                rows={1}
              />
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant={isRecording ? "destructive" : "outline"}
                  className={`h-8 w-8 ${isRecording ? "animate-pulse" : ""}`}
                  onClick={handleMicToggle}
                  disabled={isLoading}
                >
                  {isRecording ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                </Button>
                {isLoading ? (
                  <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={cancelStream}>
                    <Square className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <Button type="button" size="icon" className="h-8 w-8" onClick={handleSend} disabled={!input.trim()}>
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
            {messages.length > 0 && (
              <div className="flex justify-end mt-1">
                <button
                  type="button"
                  onClick={clearConversation}
                  className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function getDefaultSuggestions(flow: CreationFlow): string[] {
  const defaults: Record<CreationFlow, string[]> = {
    create_task: [
      'Create a listing prep workflow',
      'Add tasks for closing this buyer',
      'Create inspection + title tasks',
    ],
    add_buyer: [
      'Structure buyer preferences',
      'Identify missing buyer info',
      'Suggest follow-up questions',
    ],
    add_listing: [
      'Write listing description',
      'Identify missing fields',
      'Generate feature highlights',
    ],
  };
  return defaults[flow] || [];
}
