import { useState, useEffect, useCallback } from "react";
import { MessageSquare, Mail, RefreshCw, Loader2, Inbox, Send, FileSignature } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import MessageActionModal from "./MessageActionModal";
import AttachEmailModal from "./AttachEmailModal";
import { EmailCard, TextMessageCard } from "./MessageCard";
import CommunicationHubSettings, { HubSettings } from "./CommunicationHubSettings";
import { useSyncedEmails, SyncedEmail } from "@/hooks/useSyncedEmails";
import { useSyncedMessages } from "@/hooks/useSyncedMessages";
import { useGmailConnection } from "@/hooks/useGmailConnection";
import { useIntegrations } from "@/contexts/IntegrationsContext";

interface AICommunicationHubProps {
  limit?: number;
  showTabs?: boolean;
}

export default function AICommunicationHub({ limit, showTabs = true }: AICommunicationHubProps = {}) {
  const [selectedMessage, setSelectedMessage] = useState<{
    type: "text" | "email";
    sender: string;
    snippet: string;
    actionItem: string;
    subject?: string;
  } | null>(null);
  const [settings, setSettings] = useState<HubSettings>({
    showOnlyActionRequired: true,
    excludeCategories: [],
  });
  const [activeTab, setActiveTab] = useState("email");
  const [emailSubTab, setEmailSubTab] = useState("needs-attention");
  const [textSubTab, setTextSubTab] = useState("needs-attention");
  const [attachEmailId, setAttachEmailId] = useState<string | null>(null);
  const [attachEmailSubject, setAttachEmailSubject] = useState<string | undefined>();
  const [sentEnvelopes, setSentEnvelopes] = useState<any[]>([]);
  const [sentLoading, setSentLoading] = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();
  const { isConnected: isGmailConnected, loading: gmailLoading } = useGmailConnection();
  const { isPhoneConnected } = useIntegrations();
  const { 
    emails,
    actionRequiredEmails,
    allAnalyzedEmails,
    loading: emailsLoading, 
    syncing, 
    analyzing, 
    syncAndAnalyze,
    ignoreEmail,
    attachEmail,
  } = useSyncedEmails();

  const {
    messages: allSyncedMessages,
    actionRequiredMessages: actionRequiredTextMessages,
    allVisibleMessages: allTextMessages,
    loading: messagesLoading,
    ignoreMessage,
  } = useSyncedMessages();

  const isTextConnected = isPhoneConnected;

  // Auto-sync when Gmail is connected and we truly have no emails (including ignored ones)
  const hasAnyEmails = emails.length > 0;
  useEffect(() => {
    if (isGmailConnected && !emailsLoading && !hasAnyEmails && !syncing && !analyzing) {
      syncAndAnalyze();
    }
  }, [isGmailConnected, emailsLoading, hasAnyEmails, syncing, analyzing, syncAndAnalyze]);

  // Fetch sent DocuSign envelopes for the Sent tab
  const fetchSentEnvelopes = useCallback(async () => {
    if (!user) return;
    setSentLoading(true);
    try {
      const { data, error } = await supabase
        .from("docusign_envelopes")
        .select("id, envelope_id, subject, status, document_name, recipients, sent_at, completed_at, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      setSentEnvelopes(data || []);
    } catch (err) {
      console.error("Error fetching sent envelopes:", err);
    } finally {
      setSentLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchSentEnvelopes();
  }, [user, fetchSentEnvelopes]);

  // Filter emails based on settings
  const filteredActionEmails = actionRequiredEmails.filter(email => 
    !settings.excludeCategories.includes(email.ai_category || "other")
  );

  // Apply limit if specified
  const displayedActionEmails = limit ? filteredActionEmails.slice(0, limit) : filteredActionEmails;
  const displayedAllEmails = limit ? allAnalyzedEmails.slice(0, limit) : allAnalyzedEmails;
  
  // Filter text messages for text section
  const textActionRequired = isTextConnected ? actionRequiredTextMessages : [];
  const textAllMessages = isTextConnected ? allTextMessages : [];
  const displayedActionTexts = limit ? textActionRequired.slice(0, limit) : textActionRequired;
  const displayedAllTexts = limit ? textAllMessages.slice(0, limit) : textAllMessages;

  const handleTextAction = (message: typeof allSyncedMessages[0]) => {
    setSelectedMessage({
      type: "text",
      sender: message.sender_name || message.sender_phone || "Unknown",
      snippet: message.message_body || "",
      actionItem: message.ai_action_item || "",
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

  const handleAttachClick = (email: SyncedEmail) => {
    setAttachEmailId(email.id);
    setAttachEmailSubject(email.subject || undefined);
  };

  // Get counts for badges
  const emailNeedsAttentionCount = filteredActionEmails.length;
  const textNeedsAttentionCount = textActionRequired.length;

  const getEnvelopeStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-success/10 text-success border-success/30";
      case "sent": case "delivered": return "bg-primary/10 text-primary border-primary/25";
      case "voided": case "declined": return "bg-destructive/10 text-destructive border-destructive/30";
      default: return "bg-muted/10 text-muted-foreground border-muted/30";
    }
  };

  const renderTextNotConnected = () => (
    <div className="text-center py-12 text-text-muted text-sm bg-secondary rounded-lg border border-border">
      <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-50" />
      <p className="font-medium mb-1">Text messaging not connected</p>
      <p className="text-xs mb-3">Connect a messaging service to sync messages</p>
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate("/integrations")}
      >
        Connect in Integrations
      </Button>
    </div>
  );

  const renderTextMessages = (messages: typeof allSyncedMessages, showIgnore: boolean = true) => (
    <div className="space-y-4">
      {messagesLoading ? (
        <div className="flex items-center justify-center py-12 bg-secondary rounded-lg border border-border">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-sm text-text-muted">Loading messages...</span>
        </div>
      ) : messages.length === 0 ? (
        <div className="text-center py-12 text-text-muted text-sm bg-secondary rounded-lg border border-border">
          <Inbox className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>{textSubTab === "needs-attention" ? "No text messages need attention" : "No text messages yet"}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {messages.map((message) => (
            <TextMessageCard
              key={message.id}
              message={{
                id: message.id,
                sender: message.sender_name || message.sender_phone || "Unknown",
                snippet: message.message_body || "",
                actionItem: message.ai_action_item || "",
                timestamp: new Date(message.received_at).toLocaleString(),
                requiresAction: message.ai_requires_action || !!message.ai_action_item,
              }}
              onTakeAction={() => handleTextAction(message)}
              onIgnore={() => ignoreMessage(message.id)}
              showIgnore={showIgnore}
            />
          ))}
        </div>
      )}
    </div>
  );

  const renderEmailNotConnected = () => (
    <div className="text-center py-12 text-text-muted text-sm bg-secondary rounded-lg border border-border">
      <Mail className="h-10 w-10 mx-auto mb-3 opacity-50" />
      <p className="font-medium mb-1">Gmail not connected</p>
      <p className="text-xs mb-3">Connect Gmail to sync and analyze your emails</p>
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate("/integrations")}
      >
        Connect Gmail in Integrations
      </Button>
    </div>
  );

  const renderEmailSection = (emails: SyncedEmail[], showIgnore: boolean = true) => (
    <div className="space-y-4">
      {(emailsLoading || gmailLoading) && (
        <div className="flex items-center justify-center py-12 bg-secondary rounded-lg border border-border">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {isGmailConnected && (syncing || analyzing) && emails.length === 0 && (
        <div className="text-center py-12 text-text-muted text-sm bg-secondary rounded-lg border border-border">
          <Loader2 className="h-10 w-10 mx-auto mb-3 animate-spin text-primary" />
          <p>{syncing ? "Syncing emails from Gmail..." : "Analyzing emails with AI..."}</p>
        </div>
      )}

      {!emailsLoading && !gmailLoading && isGmailConnected && !syncing && !analyzing && emails.length > 0 && (
        <div className="grid gap-4">
          {emails.map((email) => (
            <EmailCard
              key={email.id}
              email={email}
              onIgnore={showIgnore ? () => ignoreEmail(email.id) : undefined}
              onTakeAction={() => handleEmailAction(email)}
              onAttach={() => handleAttachClick(email)}
              showIgnore={showIgnore}
            />
          ))}
        </div>
      )}

      {!emailsLoading && !gmailLoading && isGmailConnected && !syncing && !analyzing && emails.length === 0 && (
        <div className="text-center py-12 text-text-muted text-sm bg-secondary rounded-lg border border-border">
          <Inbox className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>{emailSubTab === "needs-attention" ? "No emails need attention" : "No analyzed emails yet"}</p>
          {emailSubTab === "all" && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={syncAndAnalyze}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync & Analyze Emails
            </Button>
          )}
        </div>
      )}
    </div>
  );

  const renderSentSection = () => (
    <div className="space-y-4">
      {sentLoading ? (
        <div className="flex items-center justify-center py-12 bg-secondary rounded-lg border border-border">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-sm text-text-muted">Loading sent items...</span>
        </div>
      ) : sentEnvelopes.length === 0 ? (
        <div className="text-center py-12 text-text-muted text-sm bg-secondary rounded-lg border border-border">
          <Send className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="font-medium mb-1">No sent documents yet</p>
          <p className="text-xs">Documents sent via DocuSign will appear here</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {sentEnvelopes.map((env) => {
            const recipients = Array.isArray(env.recipients) ? env.recipients : [];
            const recipientNames = recipients.map((r: any) => r.name || r.email).join(", ");
            const timestamp = env.sent_at || env.created_at;

            return (
              <div
                key={env.id}
                className="p-4 rounded-xl bg-secondary border border-border hover:border-primary/30 transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileSignature className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-sm font-semibold text-text-heading truncate">
                      {env.document_name || env.subject}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border flex-shrink-0 ${getEnvelopeStatusColor(env.status)}`}>
                      {env.status}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                    {formatDistanceToNow(new Date(timestamp), { addSuffix: true })}
                  </span>
                </div>

                <p className="text-xs font-medium text-text-body mb-1 line-clamp-1">{env.subject}</p>

                {recipientNames && (
                  <p className="text-xs text-text-subtle italic border-l-2 border-primary/40 pl-3">
                    Sent to: {recipientNames}
                  </p>
                )}

                {env.completed_at && (
                  <div className="bg-success/10 border border-success/25 rounded-md p-2 mt-2">
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
    </div>
  );

  // Non-tabbed view for dashboard widget
  if (!showTabs) {
    return (
      <div className="space-y-6">
        {/* Text Messages Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-text-heading">Text Messages</h3>
            {isTextConnected && actionRequiredTextMessages.length > 0 && (
              <span className="px-1.5 py-0.5 text-xs rounded-full bg-primary text-primary-foreground">
                {actionRequiredTextMessages.length}
              </span>
            )}
          </div>
          {!isTextConnected ? renderTextNotConnected() : renderTextMessages(displayedActionTexts, false)}
        </div>

        {/* Email Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-text-heading">Email</h3>
            {isGmailConnected && emailNeedsAttentionCount > 0 && (
              <span className="px-1.5 py-0.5 text-xs rounded-full bg-primary text-primary-foreground">
                {emailNeedsAttentionCount}
              </span>
            )}
          </div>
          {!isGmailConnected && !emailsLoading && !gmailLoading ? renderEmailNotConnected() : renderEmailSection(displayedActionEmails, false)}
        </div>
        
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

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <div className="flex items-center justify-between mb-6">
          <TabsList className="grid w-auto grid-cols-3">
            <TabsTrigger value="text" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Text Messages
              {isTextConnected && textNeedsAttentionCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-primary text-primary-foreground">
                  {textNeedsAttentionCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="email" className="gap-2">
              <Mail className="h-4 w-4" />
              Email
              {isGmailConnected && emailNeedsAttentionCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-primary text-primary-foreground">
                  {emailNeedsAttentionCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="sent" className="gap-2">
              <Send className="h-4 w-4" />
              Sent
              {sentEnvelopes.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">
                  {sentEnvelopes.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          <CommunicationHubSettings onSettingsChange={setSettings} />
        </div>

        {/* Text Messages Tab */}
        <TabsContent value="text" className="mt-0 space-y-4">
          {!isTextConnected ? (
            renderTextNotConnected()
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Button
                  variant={textSubTab === "needs-attention" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTextSubTab("needs-attention")}
                >
                  Needs Attention
                  {textNeedsAttentionCount > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-background/20">
                      {textNeedsAttentionCount}
                    </span>
                  )}
                </Button>
                <Button
                  variant={textSubTab === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTextSubTab("all")}
                >
                  All Messages
                </Button>
              </div>
              {textSubTab === "needs-attention" 
                ? renderTextMessages(displayedActionTexts)
                : renderTextMessages(displayedAllTexts, false)
              }
            </>
          )}
        </TabsContent>

        {/* Email Tab */}
        <TabsContent value="email" className="mt-0 space-y-4">
          {!isGmailConnected && !emailsLoading && !gmailLoading ? (
            renderEmailNotConnected()
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant={emailSubTab === "needs-attention" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEmailSubTab("needs-attention")}
                  >
                    Needs Attention
                    {emailNeedsAttentionCount > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-background/20">
                        {emailNeedsAttentionCount}
                      </span>
                    )}
                  </Button>
                  <Button
                    variant={emailSubTab === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEmailSubTab("all")}
                  >
                    All Emails
                  </Button>
                </div>
                {isGmailConnected && (
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
                  </Button>
                )}
              </div>
              {emailSubTab === "needs-attention" 
                ? renderEmailSection(displayedActionEmails)
                : renderEmailSection(displayedAllEmails, false)
              }
            </>
          )}
        </TabsContent>

        {/* Sent Tab */}
        <TabsContent value="sent" className="mt-0 space-y-4">
          {renderSentSection()}
        </TabsContent>
      </Tabs>

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

      {/* Attach Email Modal */}
      <AttachEmailModal
        open={!!attachEmailId}
        onOpenChange={(open) => { if (!open) setAttachEmailId(null); }}
        emailSubject={attachEmailSubject}
        onAttach={(target) => {
          if (attachEmailId) {
            attachEmail(attachEmailId, target);
            setAttachEmailId(null);
          }
        }}
      />
    </div>
  );
}
