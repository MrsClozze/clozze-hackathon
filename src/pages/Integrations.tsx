import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useIntegrations } from "@/contexts/IntegrationsContext";
import { useCalendarConnections } from "@/hooks/useCalendarConnections";
import { WhatsAppBusinessModal } from "@/components/integrations/WhatsAppBusinessModal";
import { AppleCalendarModal } from "@/components/integrations/AppleCalendarModal";
import { CalendarSyncConfirmDialog } from "@/components/integrations/CalendarSyncConfirmDialog";
import { useTasks } from "@/contexts/TasksContext";
import { useCalendarSync } from "@/hooks/useCalendarSync";
import { useGmailConnection } from "@/hooks/useGmailConnection";
import { useWhatsAppBusinessConnection } from "@/hooks/useWhatsAppBusinessConnection";
import { useDotloopConnection } from "@/hooks/useDotloopConnection";
import { useFollowUpBossConnection } from "@/hooks/useFollowUpBossConnection";
import { Check, Loader2 } from "lucide-react";

import googleCalendarLogo from "@/assets/google-calendar-logo.png";
import appleCalendarLogo from "@/assets/apple-calendar-logo.png";
import docusignLogo from "@/assets/docusign-logo-new.png";
import gmailLogo from "@/assets/gmail-logo.webp";
import whatsappLogo from "@/assets/whatsapp-logo.webp";
import dotloopLogo from "@/assets/dotloop-logo.png";
import followUpBossLogo from "@/assets/follow-up-boss-logo.png";
import { useDocuSignAuth } from "@/hooks/useDocuSignAuth";
import { GmailConnectionModal } from "@/components/integrations/GmailConnectionModal";

const integrations = [
  {
    id: "google_calendar",
    name: "Google Calendar",
    description: "Sync your appointments and showings",
    icon: googleCalendarLogo,
    isImage: true,
  },
  {
    id: "apple_calendar",
    name: "Apple Calendar",
    description: "Sync with your Apple devices",
    icon: appleCalendarLogo,
    isImage: true,
  },
  {
    id: "docusign",
    name: "DocuSign",
    description: "Digital document signing",
    icon: docusignLogo,
    isImage: true,
  },
  {
    id: "gmail",
    name: "Gmail",
    description: "Connect your Google email account",
    icon: gmailLogo,
    isImage: true,
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    description: "Connect your WhatsApp Business API account",
    icon: whatsappLogo,
    isImage: true,
    note: "Requires a Meta Business account",
  },
  {
    id: "dotloop",
    name: "Dotloop",
    description: "Sync transactions, loops, and contacts",
    icon: dotloopLogo,
    isImage: true,
  },
  {
    id: "follow_up_boss",
    name: "Follow Up Boss",
    description: "Real estate CRM",
    icon: followUpBossLogo,
    isImage: true,
  },
];

export default function Integrations() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { authenticate, isAuthenticating } = useDocuSignAuth();
  const { refreshGmailStatus } = useIntegrations();
  const { 
    isConnected: isWhatsAppBusinessConnected,
    businessPhone: whatsAppBusinessPhone,
    disconnect: disconnectWhatsAppBusiness,
    refresh: refreshWhatsAppBusiness,
  } = useWhatsAppBusinessConnection();
  const {
    isConnected: isDotloopConnected,
    connecting: dotloopConnecting,
    connect: connectDotloop,
    disconnect: disconnectDotloop,
  } = useDotloopConnection();
  const {
    isConnected: isFubConnected,
    connecting: fubConnecting,
    connectWithApiKey: connectFubApiKey,
    connectWithOAuth: connectFubOAuth,
    disconnect: disconnectFub,
    refresh: refreshFub,
  } = useFollowUpBossConnection();
  const { 
    connections, 
    loading: calendarLoading, 
    connecting: calendarConnecting,
    isConnected: isCalendarConnected,
    getConnection,
    connectGoogle, 
    connectApple,
    disconnect: disconnectCalendar,
    handleOAuthCallback 
  } = useCalendarConnections();
  const { 
    isConnected: isGmailConnected, 
    isConnecting: gmailConnecting,
    connectGmail,
    disconnectGmail,
    handleOAuthCallback: handleGmailOAuthCallback
  } = useGmailConnection();
  const { tasks, bulkEnableExternalSync } = useTasks();
  const { pullAppleEvents } = useCalendarSync();
  
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [isAppleModalOpen, setIsAppleModalOpen] = useState(false);
  const [isGmailModalOpen, setIsGmailModalOpen] = useState(false);
  const [syncConfirmProvider, setSyncConfirmProvider] = useState<"google" | "apple" | null>(null);
  const [pendingAppleCredentials, setPendingAppleCredentials] = useState<{ appleId: string; password: string } | null>(null);
  const [isFubApiKeyModalOpen, setIsFubApiKeyModalOpen] = useState(false);
  const [fubApiKey, setFubApiKey] = useState("");

  // Count tasks that would need syncing
  const tasksToSync = tasks.filter(t => t.showOnCalendar && !t.syncToExternalCalendar && !t.isDemo);

  // Track if we're currently processing OAuth to prevent double-processing
  const [isProcessingOAuth, setIsProcessingOAuth] = useState(false);
  const processedCodeRef = React.useRef<string | null>(null);

  // Handle OAuth callback from Google (Calendar or Gmail) or FUB redirect
  useEffect(() => {
    // Handle FUB OAuth redirect (comes back with ?fub=success/error/denied)
    const fubStatus = searchParams.get("fub");
    if (fubStatus) {
      setSearchParams({}, { replace: true });
      if (fubStatus === "success") {
        refreshFub();
        toast({
          title: "Follow Up Boss connected",
          description: "Your FUB account has been linked successfully!",
        });
      } else if (fubStatus === "denied") {
        toast({
          title: "Connection cancelled",
          description: "You denied Follow Up Boss access",
          variant: "destructive",
        });
      } else if (fubStatus === "error") {
        toast({
          title: "Connection failed",
          description: `Follow Up Boss connection error: ${searchParams.get("message") || "unknown"}`,
          variant: "destructive",
        });
      }
      return;
    }

    const code = searchParams.get("code");
    const scope = searchParams.get("scope");
    const storedCalendarProvider = sessionStorage.getItem("calendar_oauth_provider");
    const storedGmailProvider = sessionStorage.getItem("gmail_oauth_provider");
    
    // Prevent processing the same code twice
    if (!code || processedCodeRef.current === code || isProcessingOAuth) {
      return;
    }
    
    // Detect Gmail OAuth callback
    const isGmailCallback = storedGmailProvider === "gmail" || (scope && scope.includes("gmail"));
    
    // Detect Google Calendar OAuth callback
    const isGoogleCalendarCallback = !isGmailCallback && (
      storedCalendarProvider === "google" ||
      (scope && scope.includes("calendar"))
    );
    
    if (isGmailCallback) {
      processedCodeRef.current = code;
      setIsProcessingOAuth(true);
      setSearchParams({}, { replace: true });
      
      handleGmailOAuthCallback(code).then(success => {
        setIsProcessingOAuth(false);
        if (success) {
          toast({
            title: "Gmail connected",
            description: "Your Gmail account has been linked successfully!",
          });
        }
      }).catch(() => {
        setIsProcessingOAuth(false);
      });
    } else if (isGoogleCalendarCallback) {
      processedCodeRef.current = code;
      setIsProcessingOAuth(true);
      setSearchParams({}, { replace: true });
      
      handleOAuthCallback(code, "google").then(success => {
        setIsProcessingOAuth(false);
        if (success) {
          toast({
            title: "Google Calendar connected",
            description: "Your calendar has been linked successfully!",
          });
        }
      }).catch(() => {
        setIsProcessingOAuth(false);
      });
    }
  }, [searchParams, setSearchParams, handleOAuthCallback, handleGmailOAuthCallback, toast, isProcessingOAuth, refreshFub]);

  const handleGoogleCalendarConnect = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to connect integrations",
        variant: "destructive",
      });
      return;
    }

    if (isCalendarConnected("google")) {
      // Disconnect
      await disconnectCalendar("google");
      return;
    }

    // Check if there are existing calendar tasks - show confirmation dialog
    if (tasksToSync.length > 0) {
      setSyncConfirmProvider("google");
    } else {
      await connectGoogle();
    }
  };

  const handleAppleCalendarConnect = () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to connect integrations",
        variant: "destructive",
      });
      return;
    }

    if (isCalendarConnected("apple")) {
      disconnectCalendar("apple");
    } else {
      setIsAppleModalOpen(true);
    }
  };

  // Called when Apple modal submits credentials
  const handleAppleCredentialsSubmit = async (appleId: string, password: string): Promise<boolean> => {
    if (tasksToSync.length > 0) {
      setPendingAppleCredentials({ appleId, password });
      setSyncConfirmProvider("apple");
      return true;
    } else {
      const success = await connectApple(appleId, password);
      
      // Pull events from Apple Calendar after successful connection
      if (success) {
        try {
          const result = await pullAppleEvents();
          if (result.success && result.imported > 0) {
            toast({
              title: "Events imported",
              description: `Imported ${result.imported} events from Apple Calendar`,
            });
          }
        } catch (error) {
          console.error("Error pulling Apple events:", error);
        }
      }
      
      return success;
    }
  };

  // Called when user confirms or declines sync in the confirmation dialog
  const handleSyncConfirm = async (syncExisting: boolean) => {
    const provider = syncConfirmProvider;
    setSyncConfirmProvider(null);
    
    if (!provider) return;
    
    // First, sync existing tasks if user chose "Yes"
    if (syncExisting && tasksToSync.length > 0) {
      await bulkEnableExternalSync();
    }
    
    // Then proceed with the actual calendar connection
    if (provider === "google") {
      await connectGoogle();
    } else if (provider === "apple" && pendingAppleCredentials) {
      const success = await connectApple(pendingAppleCredentials.appleId, pendingAppleCredentials.password);
      setPendingAppleCredentials(null);
      
      // Pull events from Apple Calendar after successful connection
      if (success) {
        try {
          const result = await pullAppleEvents();
          if (result.success && result.imported > 0) {
            toast({
              title: "Events imported",
              description: `Imported ${result.imported} events from Apple Calendar`,
            });
          }
        } catch (error) {
          console.error("Error pulling Apple events:", error);
        }
      }
    }
  };

  const handleSyncCancel = () => {
    setSyncConfirmProvider(null);
    setPendingAppleCredentials(null);
  };

  const handleConnect = async (integrationId: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to connect integrations",
        variant: "destructive",
      });
      return;
    }

    if (integrationId === "google_calendar") {
      await handleGoogleCalendarConnect();
      return;
    }

    if (integrationId === "apple_calendar") {
      handleAppleCalendarConnect();
      return;
    }

    if (integrationId === "docusign") {
      await authenticate();
      return;
    }

    if (integrationId === "whatsapp") {
      setIsWhatsAppModalOpen(true);
      return;
    }

    if (integrationId === "gmail") {
      if (isGmailConnected) {
        await disconnectGmail();
      } else {
        setIsGmailModalOpen(true);
      }
      return;
    }

    if (integrationId === "dotloop") {
      await connectDotloop();
      return;
    }

    if (integrationId === "follow_up_boss") {
      setFubApiKey("");
      setIsFubApiKeyModalOpen(true);
      return;
    }

    toast({
      title: "Coming soon",
      description: `${integrationId.replace(/_/g, " ")} integration will be available soon!`,
    });
  };

  const handleDisconnect = async (integrationId: string) => {
    if (integrationId === "google_calendar") {
      await disconnectCalendar("google");
      return;
    }

    if (integrationId === "apple_calendar") {
      await disconnectCalendar("apple");
      return;
    }

    if (integrationId === "whatsapp") {
      try {
        await disconnectWhatsAppBusiness();
        toast({
          title: "WhatsApp Business disconnected",
          description: "Your WhatsApp Business account has been unlinked",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to disconnect WhatsApp Business",
          variant: "destructive",
        });
      }
      return;
    }

    if (integrationId === "gmail") {
      await disconnectGmail();
      return;
    }

    if (integrationId === "dotloop") {
      await disconnectDotloop();
      return;
    }

    if (integrationId === "follow_up_boss") {
      await disconnectFub();
      return;
    }
  };

  const handleWhatsAppSuccess = async () => {
    await refreshWhatsAppBusiness();
  };

  const getConnectionStatus = (integrationId: string) => {
    if (integrationId === "google_calendar") {
      return isCalendarConnected("google");
    }
    if (integrationId === "apple_calendar") {
      return isCalendarConnected("apple");
    }
    if (integrationId === "whatsapp") {
      return isWhatsAppBusinessConnected;
    }
    if (integrationId === "gmail") {
      return isGmailConnected;
    }
    if (integrationId === "dotloop") {
      return isDotloopConnected;
    }
    if (integrationId === "follow_up_boss") {
      return isFubConnected;
    }
    return false;
  };

  const getConnectionDetails = (integrationId: string): string | null => {
    if (integrationId === "google_calendar") {
      return getConnection("google")?.providerEmail || null;
    }
    if (integrationId === "apple_calendar") {
      return getConnection("apple")?.providerEmail || null;
    }
    if (integrationId === "whatsapp") {
      return whatsAppBusinessPhone;
    }
    return null;
  };

  const isConnectingIntegration = (integrationId: string): boolean => {
    if (integrationId === "google_calendar") {
      return calendarConnecting === "google";
    }
    if (integrationId === "apple_calendar") {
      return calendarConnecting === "apple";
    }
    if (integrationId === "docusign") {
      return isAuthenticating;
    }
    if (integrationId === "gmail") {
      return gmailConnecting;
    }
    if (integrationId === "dotloop") {
      return dotloopConnecting;
    }
    if (integrationId === "follow_up_boss") {
      return fubConnecting;
    }
    return false;
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-text-heading mb-2">Apps & Services</h1>
          <p className="text-lg text-text-muted">
            Connect your favorite tools to streamline your workflow
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {integrations.map((integration) => {
            const isConnected = getConnectionStatus(integration.id);
            const connectionDetails = getConnectionDetails(integration.id);
            const connecting = isConnectingIntegration(integration.id);

            return (
              <Card key={integration.id} className="p-6 flex flex-col">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 flex items-center justify-center flex-shrink-0 overflow-visible relative">
                    <img
                      src={integration.icon as string}
                      alt={integration.name}
                      className={`object-contain ${
                        integration.id === "dotloop" 
                          ? "w-20 h-20 scale-150" 
                          : integration.id === "follow_up_boss"
                          ? "w-16 h-16 scale-125"
                          : "w-12 h-12"
                      }`}
                    />
                    {isConnected && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-success flex items-center justify-center border-2 border-background">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-text-heading">
                      {integration.name}
                    </h3>
                    <p className="text-sm text-text-muted">{integration.description}</p>
                    {isConnected && connectionDetails && (
                      <p className="text-xs text-primary mt-1">{connectionDetails}</p>
                    )}
                  </div>
                </div>
                {isConnected ? (
                  <Button
                    variant="outline"
                    onClick={() => handleDisconnect(integration.id)}
                    className="mt-auto"
                  >
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleConnect(integration.id)}
                    disabled={connecting}
                    className="mt-auto"
                  >
                    {connecting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      "Connect"
                    )}
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
        
        <WhatsAppBusinessModal
          open={isWhatsAppModalOpen}
          onOpenChange={setIsWhatsAppModalOpen}
          onSuccess={handleWhatsAppSuccess}
        />

        <AppleCalendarModal
          isOpen={isAppleModalOpen}
          onClose={() => setIsAppleModalOpen(false)}
          onConnect={handleAppleCredentialsSubmit}
        />

        <CalendarSyncConfirmDialog
          open={syncConfirmProvider !== null}
          onOpenChange={(open) => !open && handleSyncCancel()}
          provider={syncConfirmProvider || "google"}
          onConfirm={handleSyncConfirm}
          onCancel={handleSyncCancel}
        />

        <GmailConnectionModal
          open={isGmailModalOpen}
          onOpenChange={setIsGmailModalOpen}
        />

        <Dialog open={isFubApiKeyModalOpen} onOpenChange={setIsFubApiKeyModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <img src={followUpBossLogo} alt="Follow Up Boss" className="w-10 h-10 object-contain" />
                <DialogTitle>Connect Follow Up Boss</DialogTitle>
              </div>
              <DialogDescription>
                Choose how you'd like to connect your Follow Up Boss account.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              {/* OAuth option */}
              <Button
                className="w-full"
                onClick={() => {
                  setIsFubApiKeyModalOpen(false);
                  connectFubOAuth();
                }}
                disabled={fubConnecting}
              >
                {fubConnecting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Connecting...</>
                ) : (
                  "Sign in with Follow Up Boss"
                )}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or use API key</span>
                </div>
              </div>

              {/* API key option */}
              <Input
                type="password"
                placeholder="Paste your API key here..."
                value={fubApiKey}
                onChange={(e) => setFubApiKey(e.target.value)}
              />
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setIsFubApiKeyModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  variant="secondary"
                  disabled={!fubApiKey.trim() || fubConnecting}
                  onClick={async () => {
                    const success = await connectFubApiKey(fubApiKey);
                    if (success) setIsFubApiKeyModalOpen(false);
                  }}
                >
                  {fubConnecting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Connecting...</> : "Connect with API Key"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Find your API key in Follow Up Boss under Admin → API.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
