import { MessageSquare, Mail, ArrowRight, ChevronDown, RefreshCw, Loader2 } from "lucide-react";
import BentoCard from "./BentoCard";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MessageActionModal from "./MessageActionModal";
import { useSyncedEmails, SyncedEmail } from "@/hooks/useSyncedEmails";
import { useGmailConnection } from "@/hooks/useGmailConnection";
import { formatDistanceToNow } from "date-fns";

// Mock data for text messages (keeping for now until SMS integration)
const mockTextMessages = [
  {
    id: 1,
    sender: "Sarah Johnson",
    snippet: "Hey, I got pre-approved for $500,000 today!",
    actionItem: "Looks like your client Sarah Johnson got approved for $500k. Let's send them a date where we can go look at houses and start sending them options.",
    timestamp: "2 hours ago",
  },
  {
    id: 2,
    sender: "Michael Chen",
    snippet: "Can we schedule a showing for this weekend?",
    actionItem: "Michael Chen wants to schedule a showing. Check your calendar and propose available times for this weekend.",
    timestamp: "5 hours ago",
  },
  {
    id: 3,
    sender: "Emily Davis",
    snippet: "We're ready to make an offer on the property",
    actionItem: "Emily Davis is ready to make an offer. Prepare the offer documents and discuss pricing strategy.",
    timestamp: "1 day ago",
  },
];

interface AICommunicationHubProps {
  limit?: number;
}

export default function AICommunicationHub({ limit }: AICommunicationHubProps = {}) {
  const [isTextExpanded, setIsTextExpanded] = useState(false);
  const [isEmailExpanded, setIsEmailExpanded] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<{
    type: "text" | "email";
    sender: string;
    snippet: string;
    actionItem: string;
    subject?: string;
  } | null>(null);

  const navigate = useNavigate();
  const { isConnected: isGmailConnected, loading: gmailLoading } = useGmailConnection();
  const { 
    analyzedEmails, 
    loading: emailsLoading, 
    syncing, 
    analyzing, 
    syncAndAnalyze 
  } = useSyncedEmails();

  // Auto-sync when Gmail is connected and we have no emails
  useEffect(() => {
    if (isGmailConnected && !emailsLoading && analyzedEmails.length === 0 && !syncing && !analyzing) {
      syncAndAnalyze();
    }
  }, [isGmailConnected, emailsLoading, analyzedEmails.length, syncing, analyzing, syncAndAnalyze]);

  const shouldLimitText = limit && !isTextExpanded;
  const shouldLimitEmail = limit && !isEmailExpanded;
  
  const displayedTextMessages = shouldLimitText ? mockTextMessages.slice(0, limit) : mockTextMessages;
  const displayedEmailMessages = shouldLimitEmail ? analyzedEmails.slice(0, limit) : analyzedEmails;
  
  const hasMoreTextMessages = limit && mockTextMessages.length > limit;
  const hasMoreEmailMessages = limit && analyzedEmails.length > limit;

  const handleTextAction = (message: typeof mockTextMessages[0]) => {
    setSelectedMessage({
      type: "text",
      sender: message.sender,
      snippet: message.snippet,
      actionItem: message.actionItem,
    });
  };

  const handleEmailAction = (email: SyncedEmail) => {
    setSelectedMessage({
      type: "email",
      sender: email.sender_name || email.sender_email,
      snippet: email.snippet || email.body_preview || "",
      actionItem: email.ai_action_item || "",
      subject: email.subject || undefined,
    });
  };

  const formatTimestamp = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return "";
    }
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case "urgent": return "bg-destructive/10 border-destructive/30 text-destructive";
      case "high": return "bg-warning/10 border-warning/30 text-warning";
      case "medium": return "bg-primary/10 border-primary/25 text-primary";
      default: return "bg-muted/10 border-muted/30 text-muted-foreground";
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Text Messages Section */}
      <BentoCard
        title="Text"
        subtitle="AI-analyzed text messages"
        className="h-full"
        elevated
      >
        <div className="space-y-4">
          {displayedTextMessages.map((message) => (
            <div
              key={message.id}
              className="p-4 rounded-lg bg-secondary border border-border hover:border-primary/40 transition-all duration-200 group cursor-pointer"
            >
              {/* Message Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-semibold text-text-heading">
                    {message.sender}
                  </h4>
                </div>
                <span className="text-xs text-text-muted">{message.timestamp}</span>
              </div>

              {/* Original Message Snippet */}
              <p className="text-xs text-text-subtle italic mb-3 border-l-2 border-primary/40 pl-3">
                "{message.snippet}"
              </p>

              {/* AI Action Item */}
              <div className="bg-primary/10 border border-primary/25 rounded-md p-3">
                <p className="text-xs text-text-heading leading-relaxed">
                  {message.actionItem}
                </p>
              </div>

              {/* Action Button */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-3 text-xs group-hover:text-primary transition-colors"
                onClick={() => handleTextAction(message)}
              >
                Take Action
                <ArrowRight className="h-3 w-3 ml-2" />
              </Button>
            </div>
          ))}

          {displayedTextMessages.length === 0 && (
            <div className="text-center py-8 text-text-muted text-sm">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No text messages to analyze</p>
              <p className="text-xs mt-1">Connect your phone in Integrations</p>
            </div>
          )}

          {hasMoreTextMessages && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-4"
              onClick={() => setIsTextExpanded(!isTextExpanded)}
            >
              {isTextExpanded ? 'Show Less' : `View All (${mockTextMessages.length} messages)`}
              <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${isTextExpanded ? 'rotate-180' : ''}`} />
            </Button>
          )}
        </div>
      </BentoCard>

      {/* Email Section */}
      <BentoCard
        title="Email"
        subtitle="AI-analyzed emails"
        className="h-full"
        elevated
        action={
          isGmailConnected && (
            <Button
              variant="ghost"
              size="sm"
              onClick={syncAndAnalyze}
              disabled={syncing || analyzing}
              className="text-xs"
            >
              {syncing || analyzing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-1">Sync</span>
            </Button>
          )
        }
      >
        <div className="space-y-4">
          {/* Loading state */}
          {(emailsLoading || gmailLoading) && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          {/* Not connected state */}
          {!emailsLoading && !gmailLoading && !isGmailConnected && (
            <div className="text-center py-8 text-text-muted text-sm">
              <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Gmail not connected</p>
              <Button
                variant="link"
                size="sm"
                className="text-xs mt-2"
                onClick={() => navigate("/integrations")}
              >
                Connect Gmail in Integrations
              </Button>
            </div>
          )}

          {/* Syncing state */}
          {isGmailConnected && (syncing || analyzing) && analyzedEmails.length === 0 && (
            <div className="text-center py-8 text-text-muted text-sm">
              <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-primary" />
              <p>{syncing ? "Syncing emails from Gmail..." : "Analyzing emails with AI..."}</p>
            </div>
          )}

          {/* Emails list */}
          {!emailsLoading && !gmailLoading && isGmailConnected && displayedEmailMessages.map((email) => (
            <div
              key={email.id}
              className="p-4 rounded-lg bg-secondary border border-border hover:border-primary/40 transition-all duration-200 group cursor-pointer"
            >
              {/* Email Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-semibold text-text-heading">
                    {email.sender_name || email.sender_email}
                  </h4>
                  {email.ai_priority && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${getPriorityColor(email.ai_priority)}`}>
                      {email.ai_priority}
                    </span>
                  )}
                </div>
                <span className="text-xs text-text-muted">{formatTimestamp(email.received_at)}</span>
              </div>

              {/* Email Subject */}
              {email.subject && (
                <p className="text-xs font-medium text-text-body mb-2">
                  {email.subject}
                </p>
              )}

              {/* Original Email Snippet */}
              <p className="text-xs text-text-subtle italic mb-3 border-l-2 border-primary/40 pl-3 line-clamp-2">
                "{email.snippet || email.body_preview}"
              </p>

              {/* AI Action Item */}
              <div className="bg-primary/10 border border-primary/25 rounded-md p-3">
                <p className="text-xs text-text-heading leading-relaxed">
                  {email.ai_action_item}
                </p>
              </div>

              {/* Action Button */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-3 text-xs group-hover:text-primary transition-colors"
                onClick={() => handleEmailAction(email)}
              >
                Take Action
                <ArrowRight className="h-3 w-3 ml-2" />
              </Button>
            </div>
          ))}

          {/* No emails state */}
          {!emailsLoading && !gmailLoading && isGmailConnected && !syncing && !analyzing && analyzedEmails.length === 0 && (
            <div className="text-center py-8 text-text-muted text-sm">
              <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No analyzed emails yet</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={syncAndAnalyze}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync & Analyze Emails
              </Button>
            </div>
          )}

          {hasMoreEmailMessages && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-4"
              onClick={() => setIsEmailExpanded(!isEmailExpanded)}
            >
              {isEmailExpanded ? 'Show Less' : `View All (${analyzedEmails.length} emails)`}
              <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${isEmailExpanded ? 'rotate-180' : ''}`} />
            </Button>
          )}
        </div>
      </BentoCard>

      {/* Message Action Modal */}
      {selectedMessage && (
        <MessageActionModal
          open={!!selectedMessage}
          onOpenChange={(open) => !open && setSelectedMessage(null)}
          messageType={selectedMessage.type}
          sender={selectedMessage.sender}
          originalMessage={selectedMessage.snippet}
          actionItem={selectedMessage.actionItem}
        />
      )}
    </div>
  );
}
