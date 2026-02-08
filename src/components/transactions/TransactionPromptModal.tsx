import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, FileCheck, ArrowRight, CalendarClock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getImportSourceLabel, type ImportSource } from "@/lib/importIntent";

interface TransactionPromptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recordType: "listing" | "buyer";
  recordId: string;
  recordLabel: string; // e.g. "123 Oak Ave" or "John Smith"
  importSource: ImportSource;
}

export default function TransactionPromptModal({
  open,
  onOpenChange,
  recordType,
  recordId,
  recordLabel,
  importSource,
}: TransactionPromptModalProps) {
  const [step, setStep] = useState<"prompt" | "confirm_state" | "creating">("prompt");
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

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

  const handleCreateTransaction = async (state: string) => {
    if (!user) return;
    setIsCreating(true);
    setStep("creating");

    try {
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

      handleClose();
    } catch (error: any) {
      console.error("Error creating transaction:", error);
      toast({
        title: "Error",
        description: "Failed to create transaction. Please try again.",
        variant: "destructive",
      });
      setStep("confirm_state");
    } finally {
      setIsCreating(false);
    }
  };

  const sourceLabel = getImportSourceLabel(importSource);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === "prompt" && "Start a Transaction?"}
            {step === "confirm_state" && "What stage is the deal in?"}
            {step === "creating" && "Creating Transaction..."}
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
              Select the current stage for this deal. This determines which tasks and deadlines are generated.
            </p>

            <div className="space-y-2">
              {[
                { value: "under_contract", label: "Under Contract", desc: "Contract is signed, deal is active" },
                { value: "in_escrow", label: "In Escrow", desc: "Escrow has been opened" },
                { value: "draft", label: "Just Starting", desc: "Not yet under contract" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleCreateTransaction(option.value)}
                  className="w-full text-left p-4 rounded-lg border border-border hover:border-accent-gold/40 hover:bg-accent-gold/5 transition-all group"
                >
                  <p className="text-sm font-medium group-hover:text-accent-gold transition-colors">
                    {option.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{option.desc}</p>
                </button>
              ))}
            </div>

            <Button variant="ghost" onClick={() => setStep("prompt")} className="w-full text-muted-foreground">
              Back
            </Button>
          </div>
        )}

        {step === "creating" && (
          <div className="py-10 text-center">
            <Loader2 className="h-10 w-10 mx-auto mb-4 text-accent-gold animate-spin" />
            <p className="text-sm text-muted-foreground">
              Setting up your transaction and generating tasks...
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
