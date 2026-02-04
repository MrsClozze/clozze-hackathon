import { useState, useEffect } from "react";
import { MessageSquare, Mail, RefreshCw, Loader2, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import MessageActionModal from "./MessageActionModal";
import { EmailCard, TextMessageCard } from "./MessageCard";
import CommunicationHubSettings, { HubSettings } from "./CommunicationHubSettings";
import { useSyncedEmails, SyncedEmail } from "@/hooks/useSyncedEmails";
import { useGmailConnection } from "@/hooks/useGmailConnection";
import { useIntegrations } from "@/contexts/IntegrationsContext";

// Mock data for text messages - only shown when connected
const mockTextMessages = [
  {
    id: 1,
    sender: "Sarah Johnson",
    snippet: "Hey, I got pre-approved for $500,000 today!",
    actionItem: "Looks like your client Sarah Johnson got approved for $500k. Let's send them a date where we can go look at houses and start sending them options.",
    timestamp: "2 hours ago",
    requiresAction: true,
  },
  {
    id: 2,
    sender: "Michael Chen",
    snippet: "Can we schedule a showing for this weekend?",
    actionItem: "Michael Chen wants to schedule a showing. Check your calendar and propose available times for this weekend.",
    timestamp: "5 hours ago",
    requiresAction: true,
  },
  {
    id: 3,
    sender: "Emily Davis",
    snippet: "We're ready to make an offer on the property",
    actionItem: "Emily Davis is ready to make an offer. Prepare the offer documents and discuss pricing strategy.",
    timestamp: "1 day ago",
    requiresAction: true,
  },
];

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

  const navigate = useNavigate();
  const { isConnected: isGmailConnected, loading: gmailLoading } = useGmailConnection();
  const { isPhoneConnected, isWhatsAppConnected } = useIntegrations();
  const { 
    actionRequiredEmails,
    allAnalyzedEmails,
    loading: emailsLoading, 
    syncing, 
    analyzing, 
    syncAndAnalyze,
    ignoreEmail,
  } = useSyncedEmails();

  const isTextConnected = isPhoneConnected || isWhatsAppConnected;

  // Auto-sync when Gmail is connected and we have no emails
  useEffect(() => {
    if (isGmailConnected && !emailsLoading && actionRequiredEmails.length === 0 && allAnalyzedEmails.length === 0 && !syncing && !analyzing) {
      syncAndAnalyze();
    }
  }, [isGmailConnected, emailsLoading, actionRequiredEmails.length, allAnalyzedEmails.length, syncing, analyzing, syncAndAnalyze]);

  // Filter emails based on settings
  const filteredActionEmails = actionRequiredEmails.filter(email => 
    !settings.excludeCategories.includes(email.ai_category || "other")
  );

  // Apply limit if specified
  const displayedActionEmails = limit ? filteredActionEmails.slice(0, limit) : filteredActionEmails;
  const displayedAllEmails = limit ? allAnalyzedEmails.slice(0, limit) : allAnalyzedEmails;
  
  // Only show text messages if connected
  const actionRequiredTextMessages = isTextConnected ? mockTextMessages.filter(m => m.requiresAction) : [];
  const allTextMessages = isTextConnected ? mockTextMessages : [];
  const displayedActionTexts = limit ? actionRequiredTextMessages.slice(0, limit) : actionRequiredTextMessages;
  const displayedAllTexts = limit ? allTextMessages.slice(0, limit) : allTextMessages;

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

  // Get counts for badges
  const emailNeedsAttentionCount = filteredActionEmails.length;
  const textNeedsAttentionCount = actionRequiredTextMessages.length;

  const renderTextNotConnected = () => (
    <div className="text-center py-12 text-text-muted text-sm bg-secondary rounded-lg border border-border">
      <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-50" />
      <p className="font-medium mb-1">Text messaging not connected</p>
      <p className="text-xs mb-3">Connect your phone or WhatsApp to sync messages</p>
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate("/integrations")}
      >
        Connect in Integrations
      </Button>
    </div>
  );

  const renderTextMessages = (messages: typeof mockTextMessages, showIgnore: boolean = true) => (
    <div className="space-y-4">
      {messages.length === 0 ? (
        <div className="text-center py-12 text-text-muted text-sm bg-secondary rounded-lg border border-border">
          <Inbox className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>{textSubTab === "needs-attention" ? "No text messages need attention" : "No text messages yet"}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {messages.map((message) => (
            <TextMessageCard
              key={message.id}
              message={message}
              onTakeAction={() => handleTextAction(message)}
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
      {/* Loading state */}
      {(emailsLoading || gmailLoading) && (
        <div className="flex items-center justify-center py-12 bg-secondary rounded-lg border border-border">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {/* Syncing state */}
      {isGmailConnected && (syncing || analyzing) && emails.length === 0 && (
        <div className="text-center py-12 text-text-muted text-sm bg-secondary rounded-lg border border-border">
          <Loader2 className="h-10 w-10 mx-auto mb-3 animate-spin text-primary" />
          <p>{syncing ? "Syncing emails from Gmail..." : "Analyzing emails with AI..."}</p>
        </div>
      )}

      {/* Emails list */}
      {!emailsLoading && !gmailLoading && isGmailConnected && !syncing && !analyzing && emails.length > 0 && (
        <div className="grid gap-4">
          {emails.map((email) => (
            <EmailCard
              key={email.id}
              email={email}
              onIgnore={showIgnore ? () => ignoreEmail(email.id) : undefined}
              onTakeAction={() => handleEmailAction(email)}
              showIgnore={showIgnore}
            />
          ))}
        </div>
      )}

      {/* No emails state */}
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
          <TabsList className="grid w-auto grid-cols-2">
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
                    <span className="ml-1">Sync</span>
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
    </div>
  );
}
