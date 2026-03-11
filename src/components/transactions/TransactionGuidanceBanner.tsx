import { useState, useEffect } from "react";
import { CalendarClock, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const STAGES = [
  { value: "draft", label: "Just Starting", order: 0 },
  { value: "under_contract", label: "Under Contract", order: 1 },
  { value: "in_escrow", label: "In Escrow", order: 2 },
] as const;

interface TransactionGuidanceBannerProps {
  recordType: "listing" | "buyer";
  recordId: string;
  onStartTransaction?: (currentState: string | null, transactionId: string | null) => void;
  refreshKey?: number;
}

/**
 * Always-visible stage progression control shown in buyer/listing detail views.
 * Shows current transaction state and allows advancing to next stages.
 */
export default function TransactionGuidanceBanner({
  recordType,
  recordId,
  onStartTransaction,
  refreshKey = 0,
}: TransactionGuidanceBannerProps) {
  const { user } = useAuth();
  const [currentState, setCurrentState] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !recordId) return;

    const fetchTransaction = async () => {
      setLoading(true);
      const column = recordType === "listing" ? "listing_id" : "buyer_id";
      const { data, error } = await supabase
        .from("transactions")
        .select("id, state")
        .eq(column, recordId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error checking transaction:", error);
        setLoading(false);
        return;
      }

      if (data) {
        setCurrentState(data.state);
        setTransactionId(data.id);
      } else {
        setCurrentState(null);
        setTransactionId(null);
      }
      setLoading(false);
    };

    fetchTransaction();
  }, [user, recordId, recordType, refreshKey]);

  if (!recordId || loading) return null;

  const currentStageOrder = currentState
    ? STAGES.find(s => s.value === currentState)?.order ?? -1
    : -1;

  return (
    <div className="relative flex flex-col gap-3 p-4 rounded-lg bg-primary/5 border border-primary/15 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-5 w-5 text-primary flex-shrink-0" />
        <p className="text-sm font-medium text-foreground">
          {currentState ? "Transaction Progress" : "Start a Transaction"}
        </p>
      </div>

      {!currentState && (
        <p className="text-xs text-muted-foreground">
          Start a transaction to generate your deal timeline and suggested tasks automatically.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {STAGES.map((stage) => {
          const isCompleted = stage.order <= currentStageOrder && currentState !== null;
          const isCurrent = stage.value === currentState;
          const isNext = stage.order === currentStageOrder + 1 || (currentState === null && stage.order === 0);
          const isDisabled = isCompleted && !isCurrent;
          const isFutureLocked = stage.order > currentStageOrder + 1 && currentState !== null;

          if (isCurrent) {
            return (
              <Badge
                key={stage.value}
                variant="default"
                className="gap-1.5 bg-primary text-primary-foreground cursor-default"
              >
                <CheckCircle2 className="h-3 w-3" />
                {stage.label}
              </Badge>
            );
          }

          if (isDisabled) {
            return (
              <Badge
                key={stage.value}
                variant="secondary"
                className="gap-1.5 opacity-50 cursor-default line-through"
              >
                {stage.label}
              </Badge>
            );
          }

          if (isNext) {
            return (
              <Button
                key={stage.value}
                variant="outline"
                size="sm"
                className="h-auto py-1 px-3 text-xs font-medium gap-1 border-primary/30 hover:border-primary hover:bg-primary/10"
                onClick={() => onStartTransaction?.(currentState, transactionId)}
              >
                {stage.label}
                <ArrowRight className="h-3 w-3" />
              </Button>
            );
          }

          // Future locked stage
          return (
            <Badge
              key={stage.value}
              variant="outline"
              className="gap-1.5 opacity-40 cursor-default"
            >
              {stage.label}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}
