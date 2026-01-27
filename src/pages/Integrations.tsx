import React, { useState } from "react";
import Layout from "@/components/layout/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useIntegrations } from "@/contexts/IntegrationsContext";
import { WhatsAppConnectionModal } from "@/components/integrations/WhatsAppConnectionModal";

import googleCalendarLogo from "@/assets/google-calendar-logo.png";
import outlookLogo from "@/assets/outlook-logo.png";
import appleCalendarLogo from "@/assets/apple-calendar-logo.png";
import docusignLogo from "@/assets/docusign-logo-new.png";
import gmailLogo from "@/assets/gmail-logo.webp";
import whatsappLogo from "@/assets/whatsapp-logo.webp";
import outlookEmailLogo from "@/assets/outlook-email-logo.png";
import dotloopLogo from "@/assets/dotloop-logo.png";
import followUpBossLogo from "@/assets/follow-up-boss-logo.webp";
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
  const { authenticate, isAuthenticating } = useDocuSignAuth();
  const { isWhatsAppConnected, whatsAppNumber, disconnectWhatsApp, refreshWhatsAppStatus } = useIntegrations();
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);

  const handleConnect = async (integrationId: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to connect integrations",
        variant: "destructive",
      });
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
      description: `${integrationId} integration will be available soon!`,
    });
  };

  const handleDisconnect = async (integrationId: string) => {
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
    // Refresh the integration status from the database
    await refreshWhatsAppStatus();
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
            const isWhatsApp = integration.id === "whatsapp";
            const isConnected = isWhatsApp && isWhatsAppConnected;

            return (
              <Card key={integration.id} className="p-6 flex flex-col">
                <div className="flex items-center gap-4 mb-4">
                  <img
                    src={integration.icon as string}
                    alt={integration.name}
                    className="w-12 h-12 object-contain"
                  />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-text-heading">
                      {integration.name}
                    </h3>
                    <p className="text-sm text-text-muted">{integration.description}</p>
                    {isConnected && whatsAppNumber && (
                      <p className="text-xs text-primary mt-1">{whatsAppNumber}</p>
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
                    disabled={integration.id === "docusign" && isAuthenticating}
                    className="mt-auto"
                  >
                    {integration.id === "docusign" && isAuthenticating
                      ? "Connecting..."
                      : "Connect"}
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
      </div>
    </Layout>
  );
}
