import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, FileCheck, ArrowRight, CalendarClock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getImportSourceLabel, type ImportSource } from "@/lib/importIntent";

const STAGES = [
  { value: "draft", label: "Just Starting", desc: "Not yet under contract", order: 0 },
  { value: "under_contract", label: "Under Contract", desc: "Contract is signed, deal is active", order: 1 },
  { value: "in_escrow", label: "In Escrow", desc: "Escrow has been opened", order: 2 },
] as const;

interface TransactionPromptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recordType: "listing" | "buyer";
  recordId: string;
  recordLabel: string;
  importSource: ImportSource;
  /** If a transaction already exists, pass its current state to enable stage progression */
  existingState?: string | null;
  /** If a transaction already exists, pass its id */
  existingTransactionId?: string | null;
}

export default function TransactionPromptModal({
  open,
  onOpenChange,
  recordType,
  recordId,
  recordLabel,
  importSource,
  existingState = null,
  existingTransactionId = null,
}: TransactionPromptModalProps) {
  const [step, setStep] = useState<"prompt" | "confirm_state" | "creating">("prompt");
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // When existing state is provided, skip straight to stage selection
  useEffect(() => {
    if (open && existingState !== null) {
      setStep("confirm_state");
    } else if (open) {
      setStep("prompt");
    }
  }, [open, existingState]);

  const handleClose = () => {
    setStep("prompt");
    onOpenChange(false);
  };

  const handleSkip = () => {
    toast({
      title: "Got it!",
      description: "You can start a transaction anytime from the listing or buyer detail view.",
    });
    handleClose();
  };

  const handleYes = () => {
    setStep("confirm_state");
  };

  const currentStageOrder = existingState
    ? STAGES.find(s => s.value === existingState)?.order ?? -1
    : -1;

  const handleCreateTransaction = async (state: string) => {
    if (!user) return;
    setIsCreating(true);
    setStep("creating");

    try {
      if (existingTransactionId) {
        // Update existing transaction to new stage
        const { error } = await supabase
          .from("transactions")
          .update({ state })
          .eq("id", existingTransactionId);

        if (error) throw error;

        toast({
          title: "Transaction Updated",
          description: `Deal for ${recordLabel} advanced to ${STAGES.find(s => s.value === state)?.label}. New suggested tasks are being generated.`,
        });
      } else {
        // Create new transaction
        const insertData = {
          user_id: user.id,
          state,
          ...(recordType === "listing" ? { listing_id: recordId } : { buyer_id: recordId }),
        };

        const { error } = await supabase
          .from("transactions")
          .insert(insertData);

        if (error) throw error;

        toast({
          title: "Transaction Created",
          description: `Deal started for ${recordLabel}. Your timeline and suggested tasks are being generated.`,
        });
      }

      handleClose();
    } catch (error: any) {
      console.error("Error creating/updating transaction:", error);
      toast({
        title: "Error",
        description: "Failed to process transaction. Please try again.",
        variant: "destructive",
      });
      setStep("confirm_state");
    } finally {
      setIsCreating(false);
    }
  };

  const sourceLabel = getImportSourceLabel(importSource);
  const isProgression = existingState !== null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === "prompt" && "Start a Transaction?"}
            {step === "confirm_state" && (isProgression ? "Advance the deal stage" : "What stage is the deal in?")}
            {step === "creating" && (isProgression ? "Updating Transaction..." : "Creating Transaction...")}
          </DialogTitle>
        </DialogHeader>

        {step === "prompt" && (
          <div className="space-y-5 py-2">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-accent-gold/10 border border-accent-gold/20">
              <FileCheck className="h-5 w-5 text-accent-gold flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium mb-1">
                  It looks like you added a {recordType} from a {sourceLabel}.
                </p>
                <p className="text-sm text-muted-foreground">
                  Would you like to start a transaction for <span className="font-medium text-foreground">{recordLabel}</span>?
                  This will generate your deal timeline and suggested tasks.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleSkip} className="flex-1">
                Not Yet
              </Button>
              <Button onClick={handleYes} className="flex-1 gap-2">
                Start Transaction
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === "confirm_state" && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              {isProgression
                ? "Select the next stage for this deal. This will generate additional tasks for the new stage."
                : "Select the current stage for this deal. This determines which tasks and deadlines are generated."}
            </p>

            <div className="space-y-2">
              {STAGES.map((option) => {
                const isCompleted = option.order <= currentStageOrder;
                const isCurrent = option.value === existingState;

                return (
                  <button
                    key={option.value}
                    onClick={() => !isCompleted && handleCreateTransaction(option.value)}
                    disabled={isCompleted}
                    className={`w-full text-left p-4 rounded-lg border transition-all group ${
                      isCompleted
                        ? "border-border/50 bg-muted/30 opacity-50 cursor-not-allowed"
                        : "border-border hover:border-accent-gold/40 hover:bg-accent-gold/5"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-sm font-medium transition-colors ${
                          isCompleted ? "text-muted-foreground line-through" : "group-hover:text-accent-gold"
                        }`}>
                          {option.label}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{option.desc}</p>
                      </div>
                      {isCurrent && (
                        <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                          Current
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {!isProgression && (
              <Button variant="ghost" onClick={() => setStep("prompt")} className="w-full text-muted-foreground">
                Back
              </Button>
            )}
          </div>
        )}

        {step === "creating" && (
          <div className="py-10 text-center">
            <Loader2 className="h-10 w-10 mx-auto mb-4 text-accent-gold animate-spin" />
            <p className="text-sm text-muted-foreground">
              {isProgression
                ? "Updating your transaction and generating new tasks..."
                : "Setting up your transaction and generating tasks..."}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
