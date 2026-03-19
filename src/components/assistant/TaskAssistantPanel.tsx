import { useEffect } from "react";
import { Bot, Volume2, VolumeX, Trash2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useTaskAssistant } from "@/hooks/useTaskAssistant";
import { useTaskVoice } from "@/hooks/useTaskVoice";
import { getTaskTypeConfig } from "@/lib/taskTypeConfigs";
import TaskAssistantChat from "./TaskAssistantChat";
import TaskAssistantInput from "./TaskAssistantInput";
import TaskAssistantSuggestions from "./TaskAssistantSuggestions";
import type { Task } from "@/contexts/TasksContext";

interface TaskAssistantPanelProps {
  task: Task;
  onRefreshTask?: () => void;
}

export default function TaskAssistantPanel({ task, onRefreshTask }: TaskAssistantPanelProps) {
  const { toast } = useToast();
  const typeConfig = getTaskTypeConfig(task.title);
  
  const {
    messages,
    isLoading,
    suggestedActions,
    researchSources,
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
        title: "Assistant Error",
        description: error,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const handleSaveToNotes = async (content: string) => {
    try {
      await executeAction("save_draft", { content, label: "AI Assistant" });
      toast({ title: "Saved", description: "Content saved to task notes." });
      onRefreshTask?.();
    } catch {
      toast({ title: "Error", description: "Failed to save.", variant: "destructive" });
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

  return (
    <div className="flex flex-col h-full border-l border-border bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-muted/20">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Task Assistant</h3>
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

      {/* Chat Messages */}
      <TaskAssistantChat
        messages={messages}
        isLoading={isLoading}
        researchSources={researchSources}
        onSaveToNotes={handleSaveToNotes}
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
