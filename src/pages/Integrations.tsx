import React from "react";
import Layout from "@/components/layout/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Apple, Calendar, Slack, MessageCircle, Mail } from "lucide-react";
import googleCalendarLogo from "@/assets/google-calendar-logo.png";
import outlookLogo from "@/assets/outlook-logo.png";
import appleCalendarLogo from "@/assets/apple-calendar-logo.png";
import docusignLogo from "@/assets/docusign-logo-new.png";
import gmailLogo from "@/assets/gmail-logo.webp";
import slackLogo from "@/assets/slack-logo-new.png";
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
    icon: Mail,
    isImage: false,
  },
  {
    id: "imessage",
    name: "iMessage",
    description: "Connect your Apple messaging",
    icon: MessageCircle,
    isImage: false,
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    description: "Connect your WhatsApp account",
    icon: MessageCircle,
    isImage: false,
  },
  {
    id: "slack",
    name: "Slack",
    description: "Team communication",
    icon: slackLogo,
    isImage: true,
  },
];

export default function Integrations() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { authenticate, isAuthenticating } = useDocuSignAuth();

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

    toast({
      title: "Coming soon",
      description: `${integrationId} integration will be available soon!`,
    });
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
          {integrations.map((integration) => (
            <Card key={integration.id} className="p-6 flex flex-col">
              <div className="flex items-center gap-4 mb-4">
                {integration.isImage ? (
                  <img
                    src={integration.icon as string}
                    alt={integration.name}
                    className="w-12 h-12 object-contain"
                  />
                ) : (
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    {React.createElement(integration.icon as React.ComponentType<{ className?: string }>, {
                      className: "w-6 h-6 text-primary",
                    })}
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-semibold text-text-heading">
                    {integration.name}
                  </h3>
                  <p className="text-sm text-text-muted">{integration.description}</p>
                </div>
              </div>
              <Button
                onClick={() => handleConnect(integration.id)}
                disabled={integration.id === "docusign" && isAuthenticating}
                className="mt-auto"
              >
                {integration.id === "docusign" && isAuthenticating
                  ? "Connecting..."
                  : "Connect"}
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}
