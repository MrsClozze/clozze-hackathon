import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Copy, ExternalLink, CheckCircle2 } from "lucide-react";

interface WhatsAppBusinessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function WhatsAppBusinessModal({
  open,
  onOpenChange,
  onSuccess,
}: WhatsAppBusinessModalProps) {
  const [step, setStep] = useState<"credentials" | "webhook">("credentials");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [businessPhoneNumber, setBusinessPhoneNumber] = useState("");
  const [webhookVerifyToken, setWebhookVerifyToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-business-webhook`;

  // Generate a verify token when the modal opens
  useEffect(() => {
    if (open && !webhookVerifyToken) {
      setWebhookVerifyToken(crypto.randomUUID());
    }
  }, [open, webhookVerifyToken]);

  const handleCopy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSaveCredentials = async () => {
    if (!phoneNumberId.trim() || !accessToken.trim()) {
      toast({
        title: "Missing credentials",
        description: "Please enter both Phone Number ID and Access Token",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Not authenticated",
        description: "Please sign in to connect WhatsApp Business",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Save credentials to database
      const { error } = await supabase
        .from('whatsapp_business_connections')
        .upsert({
          user_id: user.id,
          phone_number_id: phoneNumberId.trim(),
          access_token_encrypted: accessToken.trim(),
          business_phone_number: businessPhoneNumber.trim() || null,
          webhook_verify_token: webhookVerifyToken,
          is_connected: true,
          connected_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (error) throw error;

      toast({
        title: "Credentials saved",
        description: "Now configure your webhook in Meta Business Suite",
      });
      setStep("webhook");
    } catch (error: any) {
      console.error('Error saving credentials:', error);
      toast({
        title: "Failed to save credentials",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    toast({
      title: "WhatsApp Business connected!",
      description: "Your account is ready to receive messages",
    });
    
    // Reset form
    setPhoneNumberId("");
    setAccessToken("");
    setBusinessPhoneNumber("");
    setWebhookVerifyToken("");
    setStep("credentials");
    onOpenChange(false);
    onSuccess();
  };

  const handleClose = () => {
    setStep("credentials");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === "credentials" ? "Connect WhatsApp Business" : "Configure Webhook"}
          </DialogTitle>
          <DialogDescription>
            {step === "credentials" 
              ? "Enter your WhatsApp Business API credentials from Meta Business Suite."
              : "Copy these values to your Meta Business webhook settings."}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {step === "credentials" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="phoneNumberId">Phone Number ID *</Label>
                <Input
                  id="phoneNumberId"
                  placeholder="e.g., 123456789012345"
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value)}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Found in Meta Business Suite → WhatsApp → API Setup
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accessToken">Permanent Access Token *</Label>
                <Input
                  id="accessToken"
                  type="password"
                  placeholder="Your access token"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Generate in Meta Business Suite → System Users → Generate Token
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessPhone">Business Phone Number (optional)</Label>
                <Input
                  id="businessPhone"
                  placeholder="+1 234 567 8900"
                  value={businessPhoneNumber}
                  onChange={(e) => setBusinessPhoneNumber(e.target.value)}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Your WhatsApp Business phone number for display
                </p>
              </div>

              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <p className="text-sm font-medium">Need help getting these credentials?</p>
                <a
                  href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                >
                  View Meta's Setup Guide <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Go to Meta Business Suite → WhatsApp → Configuration → Webhook and enter:
              </p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Callback URL</Label>
                  <div className="flex gap-2">
                    <Input
                      value={webhookUrl}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleCopy(webhookUrl, "url")}
                    >
                      {copied === "url" ? (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Verify Token</Label>
                  <div className="flex gap-2">
                    <Input
                      value={webhookVerifyToken}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleCopy(webhookVerifyToken, "token")}
                    >
                      {copied === "token" ? (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
                  <p className="text-sm font-medium mb-2">Webhook Fields to Subscribe:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>✓ messages</li>
                    <li>✓ message_deliveries (optional)</li>
                    <li>✓ message_reads (optional)</li>
                  </ul>
                </div>
              </div>
            </>
          )}
          
          <div className="flex justify-end gap-3 pt-2">
            {step === "webhook" && (
              <Button
                variant="outline"
                onClick={() => setStep("credentials")}
                disabled={isLoading}
              >
                Back
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              onClick={step === "credentials" ? handleSaveCredentials : handleComplete}
              disabled={isLoading}
            >
              {isLoading ? "Saving..." : step === "credentials" ? "Next" : "Complete Setup"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
