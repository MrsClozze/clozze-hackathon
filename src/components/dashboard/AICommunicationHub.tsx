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

// Mock data for text messages (keeping for now until SMS integration)
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
  const [activeTab, setActiveTab] = useState("needs-attention");

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
  const displayedTextMessages = mockTextMessages.filter(m => m.requiresAction);

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

  const renderTextSection = (showIgnore: boolean = true) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold text-text-heading">Text Messages</h3>
        <span className="text-sm text-text-muted">({displayedTextMessages.length})</span>
      </div>

      {!isTextConnected ? (
        <div className="text-center py-8 text-text-muted text-sm bg-secondary rounded-lg border border-border">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Text messaging not connected</p>
          <Button
            variant="link"
            size="sm"
            className="text-xs mt-2"
            onClick={() => navigate("/integrations")}
          >
            Connect in Integrations
          </Button>
        </div>
      ) : displayedTextMessages.length === 0 ? (
        <div className="text-center py-8 text-text-muted text-sm bg-secondary rounded-lg border border-border">
          <Inbox className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No text messages need attention</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {displayedTextMessages.map((message) => (
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

  const renderEmailSection = (emails: SyncedEmail[], showIgnore: boolean = true) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-text-heading">Email</h3>
          <span className="text-sm text-text-muted">({emails.length})</span>
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

      {/* Loading state */}
      {(emailsLoading || gmailLoading) && (
        <div className="flex items-center justify-center py-8 bg-secondary rounded-lg border border-border">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {/* Not connected state */}
      {!emailsLoading && !gmailLoading && !isGmailConnected && (
        <div className="text-center py-8 text-text-muted text-sm bg-secondary rounded-lg border border-border">
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
      {isGmailConnected && (syncing || analyzing) && emails.length === 0 && (
        <div className="text-center py-8 text-text-muted text-sm bg-secondary rounded-lg border border-border">
          <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-primary" />
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
        <div className="text-center py-8 text-text-muted text-sm bg-secondary rounded-lg border border-border">
          <Inbox className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>{activeTab === "needs-attention" ? "No emails need attention" : "No analyzed emails yet"}</p>
          {activeTab === "all-emails" && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
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
        {renderTextSection(false)}
        {renderEmailSection(displayedActionEmails, false)}
        
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
      <div className="flex items-center justify-between">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <TabsList className="grid w-auto grid-cols-2">
              <TabsTrigger value="needs-attention" className="gap-2">
                <Inbox className="h-4 w-4" />
                Needs Attention
                {filteredActionEmails.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-primary text-primary-foreground">
                    {filteredActionEmails.length + displayedTextMessages.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="all-emails">
                All Emails
              </TabsTrigger>
            </TabsList>
            <CommunicationHubSettings onSettingsChange={setSettings} />
          </div>

          <TabsContent value="needs-attention" className="mt-0 space-y-8">
            {renderTextSection()}
            {renderEmailSection(displayedActionEmails)}
          </TabsContent>

          <TabsContent value="all-emails" className="mt-0">
            {renderEmailSection(displayedAllEmails, false)}
          </TabsContent>
        </Tabs>
      </div>

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
