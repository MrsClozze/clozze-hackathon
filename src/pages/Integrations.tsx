import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useIntegrations } from "@/contexts/IntegrationsContext";
import { useCalendarConnections } from "@/hooks/useCalendarConnections";
import { WhatsAppConnectionModal } from "@/components/integrations/WhatsAppConnectionModal";
import { AppleCalendarModal } from "@/components/integrations/AppleCalendarModal";
import { CalendarSyncConfirmDialog } from "@/components/integrations/CalendarSyncConfirmDialog";
import { useTasks } from "@/contexts/TasksContext";
import { Check, Loader2 } from "lucide-react";

import googleCalendarLogo from "@/assets/google-calendar-logo.png";
import outlookLogo from "@/assets/outlook-logo.png";
import appleCalendarLogo from "@/assets/apple-calendar-logo.png";
import docusignLogo from "@/assets/docusign-logo-new.png";
import gmailLogo from "@/assets/gmail-logo.webp";
import whatsappLogo from "@/assets/whatsapp-logo.webp";
import outlookEmailLogo from "@/assets/outlook-email-logo.png";
import dotloopLogo from "@/assets/dotloop-logo.png";
import followUpBossLogo from "@/assets/follow-up-boss-logo.png";
import { useDocuSignAuth } from "@/hooks/useDocuSignAuth";

const integrations = [
  {
    id: "google_calendar",
    name: "Google Calendar",
    description: "Sync your appointments and showings",
    icon: googleCalendarLogo,
    isImage: true,
  },
  {
    id: "outlook_calendar",
    name: "Outlook Calendar",
    description: "Connect your Microsoft calendar",
    icon: outlookLogo,
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
    id: "outlook_email",
    name: "Outlook Email",
    description: "Connect your Microsoft email account",
    icon: outlookEmailLogo,
    isImage: true,
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    description: "Connect your WhatsApp account",
    icon: whatsappLogo,
    isImage: true,
  },
  {
    id: "dotloop",
    name: "Dotloop",
    description: "Transaction management platform",
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
  const { isWhatsAppConnected, whatsAppNumber, disconnectWhatsApp, refreshWhatsAppStatus } = useIntegrations();
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
  const { tasks, bulkEnableExternalSync } = useTasks();
  
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [isAppleModalOpen, setIsAppleModalOpen] = useState(false);
  const [syncConfirmProvider, setSyncConfirmProvider] = useState<"google" | "apple" | null>(null);
  const [pendingAppleCredentials, setPendingAppleCredentials] = useState<{ appleId: string; password: string } | null>(null);

  // Count tasks that would need syncing
  const tasksToSync = tasks.filter(t => t.showOnCalendar && !t.syncToExternalCalendar && !t.isDemo);

  // Track if we're currently processing OAuth to prevent double-processing
  const [isProcessingOAuth, setIsProcessingOAuth] = useState(false);
  const processedCodeRef = React.useRef<string | null>(null);

  // Handle OAuth callback from Google
  useEffect(() => {
    const code = searchParams.get("code");
    const scope = searchParams.get("scope");
    const storedProvider = sessionStorage.getItem("calendar_oauth_provider");
    
    // Prevent processing the same code twice
    if (!code || processedCodeRef.current === code || isProcessingOAuth) {
      return;
    }
    
    // Detect Google Calendar OAuth callback by either:
    // 1. Having stored provider in sessionStorage (same-origin redirect)
    // 2. Having Google Calendar scopes in the URL (cross-origin redirect)
    const isGoogleCalendarCallback = code && (
      storedProvider === "google" ||
      (scope && scope.includes("calendar"))
    );
    
    if (isGoogleCalendarCallback) {
      // Mark this code as being processed
      processedCodeRef.current = code;
      setIsProcessingOAuth(true);
      
      // Clear URL params immediately
      setSearchParams({}, { replace: true });
      
      // Process the callback
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
  }, [searchParams, setSearchParams, handleOAuthCallback, toast, isProcessingOAuth]);

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
      return await connectApple(appleId, password);
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
      await connectApple(pendingAppleCredentials.appleId, pendingAppleCredentials.password);
      setPendingAppleCredentials(null);
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
        await disconnectWhatsApp();
        toast({
          title: "WhatsApp disconnected",
          description: "Your WhatsApp account has been unlinked",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to disconnect WhatsApp",
          variant: "destructive",
        });
      }
    }
  };

  const handleWhatsAppSuccess = async () => {
    await refreshWhatsAppStatus();
  };

  const getConnectionStatus = (integrationId: string) => {
    if (integrationId === "google_calendar") {
      return isCalendarConnected("google");
    }
    if (integrationId === "apple_calendar") {
      return isCalendarConnected("apple");
    }
    if (integrationId === "whatsapp") {
      return isWhatsAppConnected;
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
      return whatsAppNumber;
    }
    return null;
  };

  const isConnecting = (integrationId: string): boolean => {
    if (integrationId === "google_calendar") {
      return calendarConnecting === "google";
    }
    if (integrationId === "apple_calendar") {
      return calendarConnecting === "apple";
    }
    if (integrationId === "docusign") {
      return isAuthenticating;
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
            const connecting = isConnecting(integration.id);

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
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center border-2 border-background">
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
        
        <WhatsAppConnectionModal
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
      </div>
    </Layout>
  );
}
