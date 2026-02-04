import { Mail, MessageSquare, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { SyncedEmail } from "@/hooks/useSyncedEmails";

interface MessageCardProps {
  type: "email" | "text";
  sender: string;
  subject?: string;
  snippet: string;
  actionItem: string;
  timestamp: string;
  priority?: "low" | "medium" | "high" | "urgent" | null;
  onIgnore?: () => void;
  onTakeAction: () => void;
  showIgnore?: boolean;
}

export default function MessageCard({
  type,
  sender,
  subject,
  snippet,
  actionItem,
  timestamp,
  priority,
  onIgnore,
  onTakeAction,
  showIgnore = true,
}: MessageCardProps) {
  const Icon = type === "email" ? Mail : MessageSquare;

  const formatTimestamp = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return dateStr;
    }
  };

  const getPriorityColor = (p: string | null | undefined) => {
    switch (p) {
      case "urgent": return "bg-destructive/10 border-destructive/30 text-destructive";
      case "high": return "bg-warning/10 border-warning/30 text-warning";
      case "medium": return "bg-primary/10 border-primary/25 text-primary";
      default: return "bg-muted/10 border-muted/30 text-muted-foreground";
    }
  };

  return (
    <div className="p-4 rounded-lg bg-secondary border border-border hover:border-primary/40 transition-all duration-200 group">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Icon className="h-4 w-4 text-primary flex-shrink-0" />
          <h4 className="text-sm font-semibold text-text-heading truncate">
            {sender}
          </h4>
          {priority && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border flex-shrink-0 ${getPriorityColor(priority)}`}>
              {priority}
            </span>
          )}
        </div>
        <span className="text-xs text-text-muted flex-shrink-0 ml-2">
          {formatTimestamp(timestamp)}
        </span>
      </div>

      {/* Subject (for emails) */}
      {subject && (
        <p className="text-xs font-medium text-text-body mb-2 line-clamp-1">
          {subject}
        </p>
      )}

      {/* Original Message Snippet */}
      <p className="text-xs text-text-subtle italic mb-3 border-l-2 border-primary/40 pl-3 line-clamp-2">
        "{snippet}"
      </p>

      {/* AI Action Item */}
      <div className="bg-primary/10 border border-primary/25 rounded-md p-3 mb-3">
        <p className="text-xs text-text-heading leading-relaxed">
          {actionItem}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {showIgnore && onIgnore && (
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 text-xs text-text-muted hover:text-text-heading"
            onClick={onIgnore}
          >
            <X className="h-3 w-3 mr-1" />
            Ignore
          </Button>
        )}
        <Button
          variant="default"
          size="sm"
          className="flex-1 text-xs"
          onClick={onTakeAction}
        >
          Take Action
          <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </div>
    </div>
  );
}

interface EmailCardProps {
  email: SyncedEmail;
  onIgnore?: () => void;
  onTakeAction: () => void;
  showIgnore?: boolean;
}

export function EmailCard({ email, onIgnore, onTakeAction, showIgnore = true }: EmailCardProps) {
  // Clean up AI action items that indicate no action needed
  const getCleanActionItem = (item: string | null): string => {
    if (!item) return "Review this email";
    const lowerItem = item.toLowerCase().trim();
    if (lowerItem === "none" || lowerItem === "n/a" || lowerItem === "no action needed" || lowerItem === "no action required") {
      return "No action required - informational only";
    }
    return item;
  };

  return (
    <MessageCard
      type="email"
      sender={email.sender_name || email.sender_email}
      subject={email.subject || undefined}
      snippet={email.snippet || email.body_preview || ""}
      actionItem={getCleanActionItem(email.ai_action_item)}
      timestamp={email.received_at}
      priority={email.ai_priority}
      onIgnore={onIgnore}
      onTakeAction={onTakeAction}
      showIgnore={showIgnore}
    />
  );
}

interface TextMessageCardProps {
  message: {
    id: string | number;
    sender: string;
    snippet: string;
    actionItem: string;
    timestamp: string;
    requiresAction?: boolean;
  };
  onIgnore?: () => void;
  onTakeAction: () => void;
  showIgnore?: boolean;
}

export function TextMessageCard({ message, onIgnore, onTakeAction, showIgnore = true }: TextMessageCardProps) {
  return (
    <MessageCard
      type="text"
      sender={message.sender}
      snippet={message.snippet}
      actionItem={message.actionItem}
      timestamp={message.timestamp}
      onIgnore={onIgnore}
      onTakeAction={onTakeAction}
      showIgnore={showIgnore}
    />
  );
}
