import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Paperclip, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface AttachedEmail {
  id: string;
  sender_email: string;
  sender_name: string | null;
  subject: string | null;
  snippet: string | null;
  body_preview: string | null;
  received_at: string;
  ai_priority: string | null;
  ai_action_item: string | null;
}

interface AttachedEmailsTabProps {
  recordType: "buyer" | "listing";
  recordId: string;
}

export default function AttachedEmailsTab({ recordType, recordId }: AttachedEmailsTabProps) {
  const [emails, setEmails] = useState<AttachedEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchEmails = useCallback(async () => {
    try {
      const column = recordType === "buyer" ? "buyer_id" : "listing_id";
      const { data, error } = await supabase
        .from("synced_emails")
        .select("id, sender_email, sender_name, subject, snippet, body_preview, received_at, ai_priority, ai_action_item")
        .eq(column, recordId)
        .order("received_at", { ascending: false });

      if (error) throw error;
      setEmails(data || []);
    } catch (error) {
      console.error("Error fetching attached emails:", error);
    } finally {
      setLoading(false);
    }
  }, [recordType, recordId]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  const handleDetach = async (emailId: string) => {
    try {
      const { error } = await supabase
        .from("synced_emails")
        .update({ buyer_id: null, listing_id: null })
        .eq("id", emailId);

      if (error) throw error;

      setEmails(prev => prev.filter(e => e.id !== emailId));
      toast({
        title: "Email Detached",
        description: "Email removed from this profile.",
      });
    } catch (error) {
      console.error("Error detaching email:", error);
      toast({
        title: "Error",
        description: "Failed to detach email",
        variant: "destructive",
      });
    }
  };

  const getPriorityColor = (p: string | null) => {
    switch (p) {
      case "urgent": return "bg-destructive/10 text-destructive border-destructive/30";
      case "high": return "bg-warning/10 text-warning border-warning/30";
      case "medium": return "bg-primary/10 text-primary border-primary/25";
      default: return "bg-muted/10 text-muted-foreground border-muted/30";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="text-center py-12">
        <Mail className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
        <p className="text-sm font-medium text-text-heading mb-1">No emails attached</p>
        <p className="text-xs text-muted-foreground max-w-xs mx-auto">
          Attach emails from the Communication Hub using the <Paperclip className="inline h-3 w-3" /> button on any email card.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {emails.map((email) => (
        <div
          key={email.id}
          className="p-4 rounded-lg bg-secondary border border-border hover:border-primary/30 transition-all"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Mail className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="text-sm font-semibold text-text-heading truncate">
                {email.sender_name || email.sender_email}
              </span>
              {email.ai_priority && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full border flex-shrink-0 ${getPriorityColor(email.ai_priority)}`}>
                  {email.ai_priority}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(email.received_at), { addSuffix: true })}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDetach(email.id)}
                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                title="Detach email"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {email.subject && (
            <p className="text-xs font-medium text-text-body mb-2 line-clamp-1">{email.subject}</p>
          )}

          <p className="text-xs text-text-subtle italic border-l-2 border-primary/40 pl-3 line-clamp-2 mb-2">
            "{email.snippet || email.body_preview || ""}"
          </p>

          {email.ai_action_item && (
            <div className="bg-primary/10 border border-primary/25 rounded-md p-2">
              <p className="text-xs text-text-heading">{email.ai_action_item}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
