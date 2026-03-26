import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Paperclip, X, FileSignature, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  ai_category: string | null;
}

interface DocuSignEnvelope {
  id: string;
  envelope_id: string;
  subject: string;
  status: string;
  document_name: string | null;
  recipients: any;
  sent_at: string | null;
  completed_at: string | null;
  created_at: string;
}

interface AttachedEmailsTabProps {
  recordType: "buyer" | "listing";
  recordId: string;
}

export default function AttachedEmailsTab({ recordType, recordId }: AttachedEmailsTabProps) {
  const [emails, setEmails] = useState<AttachedEmail[]>([]);
  const [envelopes, setEnvelopes] = useState<DocuSignEnvelope[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      const column = recordType === "buyer" ? "buyer_id" : "listing_id";

      // Fetch linked emails and DocuSign envelopes in parallel
      const [emailsRes, envelopesRes] = await Promise.all([
        supabase
          .from("synced_emails")
          .select("id, sender_email, sender_name, subject, snippet, body_preview, received_at, ai_priority, ai_action_item, ai_category")
          .eq(column, recordId)
          .order("received_at", { ascending: false }),
        supabase
          .from("docusign_envelopes")
          .select("id, envelope_id, subject, status, document_name, recipients, sent_at, completed_at, created_at")
          .eq(column, recordId)
          .order("created_at", { ascending: false }),
      ]);

      if (emailsRes.error) throw emailsRes.error;
      if (envelopesRes.error) throw envelopesRes.error;

      setEmails(emailsRes.data || []);
      setEnvelopes((envelopesRes.data as DocuSignEnvelope[]) || []);
    } catch (error) {
      console.error("Error fetching communication history:", error);
    } finally {
      setLoading(false);
    }
  }, [recordType, recordId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDetach = async (emailId: string) => {
    try {
      const { error } = await supabase
        .from("synced_emails")
        .update({ buyer_id: null, listing_id: null })
        .eq("id", emailId);

      if (error) throw error;

      setEmails(prev => prev.filter(e => e.id !== emailId));
      toast({
        title: "Email Unlinked",
        description: "Email removed from this profile.",
      });
    } catch (error) {
      console.error("Error unlinking email:", error);
      toast({
        title: "Error",
        description: "Failed to unlink email",
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

  const getEnvelopeStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-success/10 text-success border-success/30";
      case "sent": return "bg-primary/10 text-primary border-primary/25";
      case "delivered": return "bg-primary/10 text-primary border-primary/25";
      case "voided": return "bg-destructive/10 text-destructive border-destructive/30";
      case "declined": return "bg-destructive/10 text-destructive border-destructive/30";
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

  const hasNoData = emails.length === 0 && envelopes.length === 0;

  if (hasNoData) {
    return (
      <div className="text-center py-12">
        <Mail className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
        <p className="text-sm font-medium text-text-heading mb-1">No communication history</p>
        <p className="text-xs text-muted-foreground max-w-xs mx-auto">
          Send documents via DocuSign or link emails from the Communication Hub to see them here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* DocuSign Sent Documents */}
      {envelopes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <FileSignature className="h-4 w-4 text-primary" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sent Documents</h4>
          </div>
          {envelopes.map((env) => {
            const recipients = Array.isArray(env.recipients) ? env.recipients : [];
            const recipientNames = recipients.map((r: any) => r.name || r.email).join(", ");
            const timestamp = env.sent_at || env.created_at;

            return (
              <div
                key={env.id}
                className="p-4 rounded-lg bg-secondary border border-border hover:border-primary/30 transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Send className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-sm font-semibold text-text-heading truncate">
                      DocuSign — {env.document_name || env.subject}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border flex-shrink-0 ${getEnvelopeStatusColor(env.status)}`}>
                      {env.status}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                    {formatDistanceToNow(new Date(timestamp), { addSuffix: true })}
                  </span>
                </div>

                <p className="text-xs font-medium text-text-body mb-1">{env.subject}</p>

                {recipientNames && (
                  <p className="text-xs text-text-subtle italic border-l-2 border-primary/40 pl-3 mb-2">
                    Sent to: {recipientNames}
                  </p>
                )}

                {env.completed_at && (
                  <div className="bg-success/10 border border-success/25 rounded-md p-2">
                    <p className="text-xs text-success">
                      Completed {formatDistanceToNow(new Date(env.completed_at), { addSuffix: true })}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Linked Emails */}
      {emails.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="h-4 w-4 text-primary" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Linked Emails</h4>
          </div>
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
                    title="Unlink email"
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
      )}
    </div>
  );
}
