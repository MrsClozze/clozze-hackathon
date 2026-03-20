import { useRef, useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, User, Globe, Copy, Save, Loader2, ListTodo, FileText, Search, Database, Sparkles, CalendarPlus, Home, FileEdit, Tag, Megaphone, CheckCircle2, ArrowUpCircle, Mail, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { parseResponseActions, stripActionMarkers, stripConversationTags } from "@/lib/taskTypeConfigs";
import type { ParsedAction } from "@/lib/taskTypeConfigs";
import type { AssistantMessage, LoadingPhase } from "@/hooks/useTaskAssistant";

interface TaskAssistantChatProps {
  messages: AssistantMessage[];
  isLoading: boolean;
  isResearching?: boolean;
  loadingPhase?: LoadingPhase;
  researchSources: { title: string; url: string }[];
  autoContextMessage?: string;
  taskContext?: { listingId?: string | null; buyerId?: string | null };
  onSaveToNotes?: (content: string) => void;
  onCreateTasks?: (content: string) => void;
  onCreateFollowUp?: (content: string) => void;
  onSaveToListing?: (content: string) => void;
  onSaveDraft?: (content: string) => void;
  onSaveToListingDescription?: (content: string) => void;
  onSaveToListingHighlights?: (content: string) => void;
  onSaveToListingNotes?: (content: string) => void;
  onSaveToListingMarketing?: (content: string) => void;
  onMarkComplete?: () => void;
  onUpdatePriority?: (priority: string) => void;
  /** Called after any action executes, with the action type for workflow continuity */
  onActionExecuted?: (actionType: string) => void;
}

const PHASE_DISPLAY: Record<LoadingPhase, { icon: typeof Database; label: string; className: string }> = {
  context: { icon: Database, label: 'Analyzing Clozze context…', className: 'text-muted-foreground' },
  research: { icon: Search, label: 'Researching external data…', className: 'text-primary' },
  generating: { icon: Sparkles, label: 'Generating response…', className: 'text-primary' },
  idle: { icon: Loader2, label: '', className: 'text-muted-foreground' },
};

const ACTION_ICONS: Record<string, typeof Save> = {
  save_notes: Save,
  create_tasks: ListTodo,
  create_task: CalendarPlus,
  create_follow_up: CalendarPlus,
  save_draft: FileText,
  draft_message: Mail,
  save_to_listing: Home,
  save_to_listing_description: FileEdit,
  save_to_listing_highlights: Tag,
  save_to_listing_notes: Save,
  save_to_listing_marketing: Megaphone,
  mark_complete: CheckCircle2,
  update_priority: ArrowUpCircle,
  resolve_group: Layers,
  copy_text: Copy,
};

/** Human-readable descriptions for grouped action confirmations */
const GROUPED_ACTION_STEPS: Record<string, string[]> = {
  resolve_group: [
    'Draft a message to the relevant party covering all identified gaps',
    'Save the draft to your task notes for review',
    'Create a follow-up task to track when you receive the response',
  ],
};

export default function TaskAssistantChat({
  messages,
  isLoading,
  isResearching,
  loadingPhase = 'idle',
  researchSources,
  autoContextMessage,
  taskContext,
  onSaveToNotes,
  onCreateTasks,
  onCreateFollowUp,
  onSaveToListing,
  onSaveDraft,
  onSaveToListingDescription,
  onSaveToListingHighlights,
  onSaveToListingNotes,
  onSaveToListingMarketing,
  onActionExecuted,
}: TaskAssistantChatProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [pendingGroupedAction, setPendingGroupedAction] = useState<ParsedAction | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loadingPhase]);

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(stripActionMarkers(content));
    toast({ title: "Copied", description: "Content copied to clipboard." });
  };

  const executeAction = (actionType: string, content: string) => {
    const cleanContent = stripActionMarkers(content);
    switch (actionType) {
      case 'save_notes':
        onSaveToNotes?.(cleanContent);
        break;
      case 'create_tasks':
        onCreateTasks?.(cleanContent);
        break;
      case 'create_task':
      case 'create_follow_up':
        onCreateFollowUp?.(cleanContent);
        break;
      case 'draft_message':
        onSaveDraft?.(cleanContent);
        break;
      case 'save_to_listing':
        onSaveToListing?.(cleanContent);
        break;
      case 'save_to_listing_description':
        onSaveToListingDescription?.(cleanContent);
        break;
      case 'save_to_listing_highlights':
        onSaveToListingHighlights?.(cleanContent);
        break;
      case 'save_to_listing_notes':
        onSaveToListingNotes?.(cleanContent);
        break;
      case 'save_to_listing_marketing':
        onSaveToListingMarketing?.(cleanContent);
        break;
      case 'save_draft':
        onSaveDraft?.(cleanContent);
        break;
      case 'resolve_group':
        onSaveDraft?.(cleanContent);
        onCreateFollowUp?.(cleanContent);
        toast({ title: "Grouped Resolution", description: "Draft saved and follow-up task created." });
        break;
      case 'copy_text':
        handleCopy(content);
        return; // Don't track copy as a workflow action
    }
    // Notify parent for workflow continuity
    onActionExecuted?.(actionType);
  };

  const handleAction = (action: ParsedAction) => {
    // Grouped actions require confirmation
    if (action.type === 'resolve_group') {
      setPendingGroupedAction(action);
      return;
    }
    executeAction(action.type, action.content);
  };

  const handleConfirmGrouped = () => {
    if (pendingGroupedAction) {
      executeAction(pendingGroupedAction.type, pendingGroupedAction.content);
      setPendingGroupedAction(null);
    }
  };

  // Auto-context empty state
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
    <>
      <ScrollArea className="flex-1" ref={scrollRef as any}>
        <div className="p-4 space-y-4">
          {messages.map((msg) => {
            const isComplete = msg.role === "assistant" && msg.content && !isLoading;
            const actions = isComplete
              ? parseResponseActions(msg.content, taskContext ? { listingId: taskContext.listingId, buyerId: taskContext.buyerId } : undefined)
              : [];
            
            const displayContent = msg.role === "assistant" 
              ? stripActionMarkers(msg.content || (isLoading ? "..." : ""))
              : msg.content;

            // Only show inline actions as prominent buttons; don't duplicate in footer
            const inlineActions = actions.filter(a => a.inline);
            const legacyActions = actions.filter(a => !a.inline);

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
                          {displayContent}
                        </ReactMarkdown>
                      </div>
                      {/* Inline action buttons — prominent, contextual */}
                      {isComplete && inlineActions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-2">
                          {inlineActions.map((action, i) => {
                            const Icon = ACTION_ICONS[action.type] || Save;
                            const isGrouped = action.type === 'resolve_group';
                            return (
                              <Button
                                key={`inline-${action.type}-${i}`}
                                variant={isGrouped ? "default" : "outline"}
                                size="sm"
                                className={`h-7 px-3 text-xs ${isGrouped ? 'bg-primary text-primary-foreground' : ''}`}
                                onClick={() => handleAction(action)}
                              >
                                <Icon className="h-3 w-3 mr-1.5" />
                                {action.label}
                              </Button>
                            );
                          })}
                        </div>
                      )}
                      {/* Footer: Copy + legacy (non-inline) actions only */}
                      {isComplete && (
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
                          {legacyActions.map((action, i) => {
                            const Icon = ACTION_ICONS[action.type] || Save;
                            return (
                              <Button
                                key={`${action.type}-${i}`}
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                                onClick={() => handleAction(action)}
                              >
                                <Icon className="h-3 w-3 mr-1" />
                                {action.label}
                              </Button>
                            );
                          })}
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

          {/* Loading indicators */}
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

      {/* Grouped Action Confirmation Dialog */}
      <AlertDialog open={!!pendingGroupedAction} onOpenChange={(open) => !open && setPendingGroupedAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              {pendingGroupedAction?.label || 'Grouped Resolution'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>This will perform the following actions:</p>
                <ul className="space-y-2">
                  {(GROUPED_ACTION_STEPS[pendingGroupedAction?.type || ''] || []).map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground">You can review and edit the draft after it's saved.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmGrouped}>
              Proceed
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}