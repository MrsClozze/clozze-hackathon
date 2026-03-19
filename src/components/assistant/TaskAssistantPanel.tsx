import { useEffect, useMemo } from "react";
import { Volume2, VolumeX, Trash2, Zap, Database, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useTaskAssistant } from "@/hooks/useTaskAssistant";
import { useTaskVoice } from "@/hooks/useTaskVoice";
import { getTaskTypeConfig, buildAutoContextMessage } from "@/lib/taskTypeConfigs";
import type { AutoContextData } from "@/lib/taskTypeConfigs";
import TaskAssistantChat from "./TaskAssistantChat";
import TaskAssistantInput from "./TaskAssistantInput";
import TaskAssistantSuggestions from "./TaskAssistantSuggestions";
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
    setTranscript,
    startRecording,
    stopRecording,
    playResponse,
    stopPlayback,
  } = useTaskVoice();

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
      toast({ title: "Saved", description: "Content saved to listing notes." });
      onRefreshTask?.();
    } catch {
      toast({ title: "Error", description: "Failed to save to listing.", variant: "destructive" });
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

  const lastAssistantMessage = [...messages].reverse().find(m => m.role === "assistant");

  const taskContext = useMemo(() => ({
    listingId: task.listingId || null,
    buyerId: task.buyerId || null,
  }), [task.listingId, task.buyerId]);

  return (
    <div className="flex flex-col h-full border-l border-border bg-background">
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
        <div className="flex items-center gap-1">
          {lastAssistantMessage?.content && (
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
          {messages.length > 0 && (
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
      />

      {/* Suggestions */}
      {messages.length === 0 && (
        <TaskAssistantSuggestions
          suggestions={displaySuggestions}
          onSelect={sendMessage}
          isLoading={isLoading}
        />
      )}

      {/* Input */}
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
    </div>
  );
}
