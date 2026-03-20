import { useEffect, useMemo, useState, useCallback } from "react";
import { Volume2, VolumeX, Trash2, Zap, Database, Globe, RotateCcw, AudioLines } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { useTaskAssistant } from "@/hooks/useTaskAssistant";
import { useTaskVoice } from "@/hooks/useTaskVoice";
import { useConversationMode } from "@/hooks/useConversationMode";
import { getTaskTypeConfig, buildAutoContextMessage } from "@/lib/taskTypeConfigs";
import { recordAction } from "@/lib/workflowState";
import type { AutoContextData } from "@/lib/taskTypeConfigs";
import TaskAssistantChat from "./TaskAssistantChat";
import TaskAssistantInput from "./TaskAssistantInput";
import TaskAssistantSuggestions from "./TaskAssistantSuggestions";
import ConversationModeOverlay from "./ConversationModeOverlay";
import type { Task } from "@/contexts/TasksContext";
import { useBuyers } from "@/contexts/BuyersContext";
import { useListings } from "@/contexts/ListingsContext";

interface TaskAssistantPanelProps {
  task: Task;
  onRefreshTask?: () => void;
}

export default function TaskAssistantPanel({ task, onRefreshTask }: TaskAssistantPanelProps) {
  const { toast } = useToast();
  const typeConfig = getTaskTypeConfig(task.title);
  const { buyers } = useBuyers();
  const { listings } = useListings();
  const [confirmAction, setConfirmAction] = useState<{ type: string; label: string; description: string } | null>(null);

  // Build context info for display
  const contextInfo = useMemo(() => {
    const parts: string[] = ['Task'];
    const buyer = task.buyerId ? buyers.find(b => b.id === task.buyerId) : null;
    const listing = task.listingId ? listings.find(l => l.id === task.listingId) : null;
    if (buyer) parts.push('Client');
    if (listing) parts.push('Property');
    if (task.notes) parts.push('Notes');
    return parts;
  }, [task, buyers, listings]);

  // Build auto-context data from real entity data
  const autoContextData = useMemo((): AutoContextData => {
    const buyer = task.buyerId ? buyers.find(b => b.id === task.buyerId) : null;
    const listing = task.listingId ? listings.find(l => l.id === task.listingId) : null;
    return {
      taskTitle: task.title,
      taskStatus: task.status,
      taskPriority: task.priority,
      taskNotes: task.notes || undefined,
      taskAddress: task.address || (listing ? `${listing.address}, ${listing.city}` : undefined),
      buyerName: buyer ? `${buyer.firstName} ${buyer.lastName}` : undefined,
      buyerStatus: buyer?.status || undefined,
      buyerPreApproved: buyer?.preApprovedAmount || undefined,
      buyerWantsNeeds: buyer?.wantsNeeds || undefined,
      listingAddress: listing ? `${listing.address}, ${listing.city}` : undefined,
      listingPrice: listing?.price || undefined,
      listingBeds: listing?.bedrooms || undefined,
      listingBaths: listing?.bathrooms || undefined,
      listingSqFt: listing?.sqFeet || undefined,
      listingStatus: listing?.status || undefined,
      sellerName: listing?.sellerFirstName ? `${listing.sellerFirstName} ${listing.sellerLastName || ''}`.trim() : undefined,
    };
  }, [task, buyers, listings]);

  const autoContextMessage = useMemo(() => {
    return buildAutoContextMessage(autoContextData);
  }, [autoContextData]);

  const {
    messages,
    isLoading,
    suggestedActions,
    researchSources,
    isResearching,
    loadingPhase,
    error,
    sendMessage,
    cancelStream,
    clearConversation,
    executeAction,
  } = useTaskAssistant({ taskId: task.id });

  const {
    isRecording,
    isPlayingAudio,
    transcript,
    hasLastResponse,
    setTranscript,
    startRecording,
    stopRecording,
    playResponse,
    stopPlayback,
    replayLastResponse,
  } = useTaskVoice();

  // Conversation Mode — voice-first interaction loop
  const {
    state: conversationState,
    liveTranscript: conversationTranscript,
    isActive: isConversationActive,
    startConversation,
    endConversation,
  } = useConversationMode({
    sendMessage,
    messages,
    isLoading,
  });

  const handleStartConversation = useCallback(async () => {
    try {
      await startConversation();
    } catch (err: any) {
      toast({
        title: "Voice Unavailable",
        description: err?.message?.includes("getUserMedia")
          ? "Please allow microphone access in your browser."
          : "Could not start voice session. Please try again.",
        variant: "destructive",
      });
    }
  }, [startConversation, toast]);

  // Show suggested actions from config when no server suggestions yet
  const displaySuggestions = suggestedActions.length > 0 
    ? suggestedActions 
    : typeConfig.suggestedActions;

  // Show error toast
  useEffect(() => {
    if (error) {
      toast({
        title: "Clozze AI Error",
        description: error,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const handleSaveToNotes = async (content: string) => {
    try {
      await executeAction("save_draft", { content, label: "Clozze AI" });
      toast({ title: "Saved", description: "Content saved to task notes." });
      onRefreshTask?.();
    } catch {
      toast({ title: "Error", description: "Failed to save.", variant: "destructive" });
    }
  };

  const handleCreateTasks = async (content: string) => {
    try {
      const lines = content.split('\n').filter(l => l.trim());
      const tasks = lines.slice(0, 10).map(line => ({ title: line.trim() }));
      await executeAction("batch_create_tasks", { tasks });
      toast({ title: "Tasks Created", description: `Created ${tasks.length} follow-up tasks.` });
      onRefreshTask?.();
    } catch {
      toast({ title: "Error", description: "Failed to create tasks.", variant: "destructive" });
    }
  };

  const handleCreateFollowUp = async (content: string) => {
    try {
      // Extract a reasonable title from the content
      const firstLine = content.split('\n').find(l => l.trim())?.trim().substring(0, 100) || 'Follow up';
      await executeAction("create_follow_up", { title: firstLine, daysFromNow: 3, priority: 'medium' });
      toast({ title: "Follow-Up Created", description: "Follow-up task created with a 3-day deadline." });
      onRefreshTask?.();
    } catch {
      toast({ title: "Error", description: "Failed to create follow-up.", variant: "destructive" });
    }
  };

  const handleSaveToListing = async (content: string) => {
    try {
      await executeAction("save_to_listing", { content, field: 'description' });
      toast({ title: "Saved", description: "Content saved to listing." });
      onRefreshTask?.();
    } catch {
      toast({ title: "Error", description: "Failed to save to listing.", variant: "destructive" });
    }
  };

  const handleSaveToListingDescription = async (content: string) => {
    try {
      await executeAction("save_to_listing_description", { content });
      toast({ title: "Saved", description: "Listing description updated." });
      onRefreshTask?.();
    } catch {
      toast({ title: "Error", description: "Failed to save description.", variant: "destructive" });
    }
  };

  const handleSaveToListingHighlights = async (content: string) => {
    try {
      await executeAction("save_to_listing_highlights", { content });
      toast({ title: "Saved", description: "Property highlights updated." });
      onRefreshTask?.();
    } catch {
      toast({ title: "Error", description: "Failed to save highlights.", variant: "destructive" });
    }
  };

  const handleSaveToListingNotes = async (content: string) => {
    try {
      await executeAction("save_to_listing_notes", { content, label: "AI Research" });
      toast({ title: "Saved", description: "Notes added to listing." });
      onRefreshTask?.();
    } catch {
      toast({ title: "Error", description: "Failed to save notes.", variant: "destructive" });
    }
  };

  const handleSaveToListingMarketing = async (content: string) => {
    try {
      await executeAction("save_to_listing_marketing", { content, variant: "primary" });
      toast({ title: "Saved", description: "Marketing copy saved to listing." });
      onRefreshTask?.();
    } catch {
      toast({ title: "Error", description: "Failed to save marketing copy.", variant: "destructive" });
    }
  };

  const handleSaveDraft = async (content: string) => {
    try {
      await executeAction("save_draft", { content, label: "Draft" });
      toast({ title: "Draft Saved", description: "Draft saved to task notes." });
      onRefreshTask?.();
    } catch {
      toast({ title: "Error", description: "Failed to save draft.", variant: "destructive" });
    }
  };

  /** Record action to workflow state for continuity across sessions */
  const handleActionExecuted = useCallback((actionType: string) => {
    // Determine record type and ID for workflow state
    if (task.listingId) {
      recordAction('listing', task.listingId, actionType, actionType.replace(/_/g, ' '));
    } else if (task.buyerId) {
      recordAction('buyer', task.buyerId, actionType, actionType.replace(/_/g, ' '));
    }
  }, [task.listingId, task.buyerId]);

  const handleMarkComplete = () => {
    setConfirmAction({
      type: 'mark_complete',
      label: 'Mark Task Complete',
      description: `Are you sure you want to mark "${task.title}" as completed? You can undo this later.`,
    });
  };

  const handleUpdatePriority = (priority: string) => {
    setConfirmAction({
      type: 'update_priority',
      label: `Set Priority to ${priority.charAt(0).toUpperCase() + priority.slice(1)}`,
      description: `Change the priority of "${task.title}" to ${priority}?`,
    });
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    try {
      if (confirmAction.type === 'mark_complete') {
        await executeAction("mark_complete", {});
        toast({ title: "Task Completed", description: "Task has been marked as complete." });
      } else if (confirmAction.type === 'update_priority') {
        const priority = confirmAction.label.split(' ').pop()?.toLowerCase() || 'medium';
        await executeAction("update_priority", { priority });
        toast({ title: "Priority Updated", description: `Priority set to ${priority}.` });
      }
      onRefreshTask?.();
    } catch {
      toast({ title: "Error", description: "Action failed.", variant: "destructive" });
    } finally {
      setConfirmAction(null);
    }
  };

  const handlePlayLastResponse = () => {
    const lastAssistantMsg = [...messages].reverse().find(m => m.role === "assistant");
    if (lastAssistantMsg?.content) {
      if (isPlayingAudio) {
        stopPlayback();
      } else {
        playResponse(lastAssistantMsg.content);
      }
    }
  };

  const handleReplay = () => {
    if (!isPlayingAudio && hasLastResponse) {
      replayLastResponse();
    }
  };

  const lastAssistantMessage = [...messages].reverse().find(m => m.role === "assistant");

  const taskContext = useMemo(() => ({
    listingId: task.listingId || null,
    buyerId: task.buyerId || null,
  }), [task.listingId, task.buyerId]);

  return (
    <div className="flex flex-col h-full border-l border-border bg-background relative">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-muted/20">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Clozze AI</h3>
            <p className="text-xs text-muted-foreground">
              {typeConfig.icon} {typeConfig.label}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Conversation Mode button */}
          {!isConversationActive && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 relative group"
              onClick={handleStartConversation}
              title="Start Conversation Mode"
            >
              <span className="absolute inset-0 rounded-md bg-primary/10 animate-[pulse_2.5s_cubic-bezier(0.4,0,0.6,1)_infinite] group-hover:bg-primary/20 transition-colors" />
              <AudioLines className="h-4 w-4 text-primary relative z-10" />
            </Button>
          )}
          {/* Voice playback indicator */}
          {isPlayingAudio && !isConversationActive && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 mr-1">
              <div className="flex gap-0.5 items-end h-3">
                <div className="w-0.5 h-1 bg-primary animate-pulse rounded-full" style={{ animationDelay: '0ms' }} />
                <div className="w-0.5 h-2 bg-primary animate-pulse rounded-full" style={{ animationDelay: '150ms' }} />
                <div className="w-0.5 h-3 bg-primary animate-pulse rounded-full" style={{ animationDelay: '300ms' }} />
                <div className="w-0.5 h-2 bg-primary animate-pulse rounded-full" style={{ animationDelay: '150ms' }} />
                <div className="w-0.5 h-1 bg-primary animate-pulse rounded-full" style={{ animationDelay: '0ms' }} />
              </div>
              <span className="text-[10px] text-primary font-medium">Speaking</span>
            </div>
          )}
          {lastAssistantMessage?.content && !isConversationActive && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handlePlayLastResponse}
              title={isPlayingAudio ? "Stop playback" : "Listen to response"}
            >
              {isPlayingAudio ? (
                <VolumeX className="h-4 w-4 text-primary" />
              ) : (
                <Volume2 className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          )}
          {hasLastResponse && !isPlayingAudio && !isConversationActive && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleReplay}
              title="Replay last response"
            >
              <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          )}
          {messages.length > 0 && !isConversationActive && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={clearConversation}
              title="Clear conversation"
            >
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          )}
        </div>
      </div>

      {/* Context Indicator */}
      <div className="px-3 py-1.5 border-b border-border/50 bg-muted/10">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Database className="h-3 w-3" />
          <span>Using: {contextInfo.join(' + ')}</span>
          {isResearching && (
            <>
              <span className="text-muted-foreground/50">•</span>
              <Globe className="h-3 w-3 text-primary animate-pulse" />
              <span className="text-primary">Live Research</span>
            </>
          )}
          {isConversationActive && (
            <>
              <span className="text-muted-foreground/50">•</span>
              <AudioLines className="h-3 w-3 text-primary" />
              <span className="text-primary">Voice</span>
            </>
          )}
        </div>
      </div>

      {/* Chat Messages */}
      <TaskAssistantChat
        messages={messages}
        isLoading={isLoading}
        isResearching={isResearching}
        loadingPhase={loadingPhase}
        researchSources={researchSources}
        autoContextMessage={messages.length === 0 ? autoContextMessage : undefined}
        taskContext={taskContext}
        onSaveToNotes={handleSaveToNotes}
        onCreateTasks={handleCreateTasks}
        onCreateFollowUp={handleCreateFollowUp}
        onSaveToListing={handleSaveToListing}
        onSaveDraft={handleSaveDraft}
        onSaveToListingDescription={handleSaveToListingDescription}
        onSaveToListingHighlights={handleSaveToListingHighlights}
        onSaveToListingNotes={handleSaveToListingNotes}
        onSaveToListingMarketing={handleSaveToListingMarketing}
        onActionExecuted={handleActionExecuted}
      />

      {/* Suggestions */}
      {messages.length === 0 && !isConversationActive && (
        <TaskAssistantSuggestions
          suggestions={displaySuggestions}
          onSelect={sendMessage}
          isLoading={isLoading}
        />
      )}

      {/* Input — hidden during conversation mode */}
      {!isConversationActive && (
        <TaskAssistantInput
          onSend={sendMessage}
          isLoading={isLoading}
          onCancel={cancelStream}
          isRecording={isRecording}
          transcript={transcript}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
          onTranscriptChange={setTranscript}
        />
      )}

      {/* Conversation Mode Overlay */}
      {isConversationActive && (
        <ConversationModeOverlay
          state={conversationState}
          liveTranscript={conversationTranscript}
          onEnd={endConversation}
        />
      )}

      {/* Confirmation Dialog for Direct Execution */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmAction?.label}</AlertDialogTitle>
            <AlertDialogDescription>{confirmAction?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
