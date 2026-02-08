import { useState, useEffect } from "react";
import { CalendarClock, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface TransactionGuidanceBannerProps {
  recordType: "listing" | "buyer";
  recordId: string;
  onStartTransaction?: () => void;
}

/**
 * Medium-confidence guidance banner shown in buyer/listing detail views
 * when no transaction is linked yet.
 * Dismissible and non-intrusive.
 */
export default function TransactionGuidanceBanner({
  recordType,
  recordId,
  onStartTransaction,
}: TransactionGuidanceBannerProps) {
  const { user } = useAuth();
  const [isDismissed, setIsDismissed] = useState(false);
  const [hasTransaction, setHasTransaction] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user || !recordId) return;

    // Check if a transaction already exists for this record
    const checkTransaction = async () => {
      const column = recordType === "listing" ? "listing_id" : "buyer_id";
      const { data, error } = await supabase
        .from("transactions")
        .select("id")
        .eq(column, recordId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error checking transaction:", error);
        setHasTransaction(true); // Hide banner on error
        return;
      }

      setHasTransaction(!!data);
    };

    checkTransaction();

    // Check session dismissal
    const dismissKey = `txn_banner_dismissed_${recordId}`;
    if (sessionStorage.getItem(dismissKey)) {
      setIsDismissed(true);
    }
  }, [user, recordId, recordType]);

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem(`txn_banner_dismissed_${recordId}`, "true");
  };

  // Don't render if: dismissed, has transaction, still loading, or no record
  if (isDismissed || hasTransaction !== false || !recordId) return null;

  return (
    <div className="relative flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/15 animate-in fade-in slide-in-from-top-2 duration-300">
      <CalendarClock className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground mb-0.5">
          Ready to track this deal?
        </p>
        <p className="text-xs text-muted-foreground">
          Most agents start a transaction once a contract is signed. Transactions generate your deal timeline and suggested tasks automatically.
        </p>
        {onStartTransaction && (
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 mt-1.5 text-xs text-primary font-medium gap-1"
            onClick={onStartTransaction}
          >
            Start a Transaction
            <ArrowRight className="h-3 w-3" />
          </Button>
        )}
      </div>
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors p-0.5"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
