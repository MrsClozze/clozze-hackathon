import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Edit3, Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface MessageActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messageType: "text" | "email";
  sender: string;
  originalMessage: string;
  actionItem: string;
}

export default function MessageActionModal({
  open,
  onOpenChange,
  messageType,
  sender,
  originalMessage,
  actionItem,
}: MessageActionModalProps) {
  const [mode, setMode] = useState<"select" | "ai" | "manual">("select");
  const [responseText, setResponseText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const handleAIAssist = async () => {
    setMode("ai");
    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke("generate-message-response", {
        body: {
          messageType,
          sender,
          originalMessage,
          actionItem,
        },
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      setResponseText(data.response);
    } catch (error) {
      console.error("Error generating response:", error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Could not generate AI response. Please try again.",
        variant: "destructive",
      });
      setMode("select");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleManualMode = () => {
    setMode("manual");
    setResponseText("");
  };

  const handleSend = async () => {
    if (!responseText.trim()) {
      toast({
        title: "Empty Message",
        description: "Please write a message before sending.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    
    // Simulate sending (in real app, this would integrate with email/SMS service)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast({
      title: "Message Sent!",
      description: `Your ${messageType} has been sent to ${sender}.`,
    });

    setIsSending(false);
    handleClose();
  };

  const handleClose = () => {
    setMode("select");
    setResponseText("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            Respond to {messageType === "email" ? "Email" : "Text"} from {sender}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Original Message Context */}
          <div className="bg-background-elevated rounded-lg p-4 border border-card-border">
            <p className="text-xs text-text-muted mb-2">Original Message:</p>
            <p className="text-sm text-text-subtle italic border-l-2 border-accent-gold/30 pl-3 mb-3">
              "{originalMessage}"
            </p>
            <div className="bg-accent-gold/5 border border-accent-gold/20 rounded-md p-3">
              <p className="text-xs text-text-muted mb-1">Action Item:</p>
              <p className="text-xs text-text-heading">{actionItem}</p>
            </div>
          </div>

          {/* Mode Selection */}
          {mode === "select" && (
            <div className="space-y-3">
              <p className="text-sm text-text-muted">How would you like to respond?</p>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col gap-2 hover:border-accent-gold/50 transition-colors"
                  onClick={handleAIAssist}
                >
                  <Sparkles className="h-5 w-5 text-accent-gold" />
                  <span className="font-semibold">AI Assist</span>
                  <span className="text-xs text-text-muted">
                    Generate response with AI
                  </span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col gap-2 hover:border-accent-gold/50 transition-colors"
                  onClick={handleManualMode}
                >
                  <Edit3 className="h-5 w-5 text-accent-gold" />
                  <span className="font-semibold">Write Manually</span>
                  <span className="text-xs text-text-muted">
                    Type your own message
                  </span>
                </Button>
              </div>
            </div>
          )}

          {/* AI Generation Loading */}
          {mode === "ai" && isGenerating && (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <Loader2 className="h-8 w-8 text-accent-gold animate-spin" />
              <p className="text-sm text-text-muted">Generating your response...</p>
            </div>
          )}

          {/* Response Editor */}
          {mode !== "select" && !isGenerating && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-text-heading">
                  Your Response:
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMode("select")}
                  className="text-xs"
                >
                  Back to Options
                </Button>
              </div>
              <Textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder={`Type your ${messageType} response here...`}
                className="min-h-[150px] resize-none"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={handleSend} disabled={isSending}>
                  {isSending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send {messageType === "email" ? "Email" : "Text"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
