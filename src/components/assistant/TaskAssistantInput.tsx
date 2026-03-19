import { useState, useRef, useEffect } from "react";
import { Send, Mic, MicOff, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface TaskAssistantInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  onCancel: () => void;
  isRecording: boolean;
  transcript: string;
  onStartRecording: () => void;
  onStopRecording: () => string;
  onTranscriptChange: (t: string) => void;
}

export default function TaskAssistantInput({
  onSend,
  isLoading,
  onCancel,
  isRecording,
  transcript,
  onStartRecording,
  onStopRecording,
  onTranscriptChange,
}: TaskAssistantInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // When recording stops, populate the input
  useEffect(() => {
    if (!isRecording && transcript) {
      setInput(transcript);
      onTranscriptChange("");
    }
  }, [isRecording, transcript, onTranscriptChange]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    onSend(text);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleMicToggle = () => {
    if (isRecording) {
      const finalTranscript = onStopRecording();
      if (finalTranscript) setInput(finalTranscript);
    } else {
      onStartRecording();
    }
  };

  return (
    <div className="p-3 border-t border-border bg-background">
      {isRecording && (
        <div className="flex items-center gap-2 mb-2 px-2 py-1.5 bg-destructive/10 rounded-md">
          <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
          <span className="text-xs text-destructive">Listening...</span>
          {transcript && (
            <span className="text-xs text-muted-foreground truncate flex-1">{transcript}</span>
          )}
        </div>
      )}
      <div className="flex gap-2 items-end">
        <Textarea
          ref={textareaRef}
          value={isRecording ? transcript : input}
          onChange={(e) => isRecording ? undefined : setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isRecording ? "Listening..." : "Ask about this task..."}
          disabled={isLoading}
          className="min-h-[40px] max-h-[120px] resize-none text-sm flex-1"
          rows={1}
        />
        <div className="flex gap-1">
          <Button
            size="icon"
            variant={isRecording ? "destructive" : "outline"}
            className={`h-9 w-9 ${isRecording ? "animate-pulse" : ""}`}
            onClick={handleMicToggle}
            disabled={isLoading}
          >
            {isRecording ? (
              <MicOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>
          {isLoading ? (
            <Button
              size="icon"
              variant="outline"
              className="h-9 w-9"
              onClick={onCancel}
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              className="h-9 w-9"
              onClick={handleSend}
              disabled={!input.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
