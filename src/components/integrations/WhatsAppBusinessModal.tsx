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
import { Copy, ExternalLink, CheckCircle2, ArrowRight, ArrowLeft, Info } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import whatsappLogo from "@/assets/whatsapp-logo.webp";

interface WhatsAppBusinessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type Step = "intro" | "credentials" | "webhook";

export function WhatsAppBusinessModal({
  open,
  onOpenChange,
  onSuccess,
}: WhatsAppBusinessModalProps) {
  const [step, setStep] = useState<Step>("intro");
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
    setStep("intro");
    onOpenChange(false);
    onSuccess();
  };

  const handleClose = () => {
    setStep("intro");
    onOpenChange(false);
  };

  const getProgress = () => {
    switch (step) {
      case "intro": return 0;
      case "credentials": return 50;
      case "webhook": return 100;
    }
  };

  const getStepNumber = () => {
    switch (step) {
      case "intro": return 0;
      case "credentials": return 1;
      case "webhook": return 2;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="mx-auto w-14 h-14 rounded-2xl bg-[#25D366]/10 flex items-center justify-center mb-4">
            <img src={whatsappLogo} alt="WhatsApp Business" className="w-10 h-10 object-contain" />
          </div>
          <DialogTitle className="text-center">
            {step === "intro" && "Connect WhatsApp Business"}
            {step === "credentials" && "Step 1: Enter Your Credentials"}
            {step === "webhook" && "Step 2: Configure Webhook"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {step === "intro" && "Sync messages from your WhatsApp Business account"}
            {step === "credentials" && "Enter your WhatsApp Business API credentials from Meta"}
            {step === "webhook" && "Copy these values to your Meta Business webhook settings"}
          </DialogDescription>
        </DialogHeader>
        
        {step !== "intro" && (
          <div className="px-1">
            <Progress value={getProgress()} className="h-1.5" />
            <p className="text-xs text-muted-foreground mt-1 text-center">
              Step {getStepNumber()} of 2
            </p>
          </div>
        )}
        
        <div className="space-y-4 py-2">
          {step === "intro" && (
            <>
              <div className="rounded-lg border-2 border-warning/30 bg-warning/5 p-4">
                <div className="flex gap-3">
                  <Info className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">WhatsApp Business Account Required</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      This integration requires a <strong>WhatsApp Business API</strong> account through Meta Business Platform. 
                      Personal WhatsApp accounts cannot be connected.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium">Before you begin, make sure you have:</p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-medium text-primary">1</span>
                    </div>
                    <span>A verified <strong>Meta Business account</strong> at business.facebook.com</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-medium text-primary">2</span>
                    </div>
                    <span>A <strong>WhatsApp Business API</strong> app created in Meta Developer Portal</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-medium text-primary">3</span>
                    </div>
                    <span>A <strong>permanent access token</strong> from System Users settings</span>
                  </li>
                </ul>
              </div>

              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="text-sm font-medium mb-2">New to WhatsApp Business API?</p>
                <a
                  href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                >
                  Follow Meta's Getting Started Guide <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </>
          )}

          {step === "credentials" && (
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
                  Find this in <strong>Meta Business Suite → WhatsApp → API Setup</strong>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accessToken">Permanent Access Token *</Label>
                <Input
                  id="accessToken"
                  type="password"
                  placeholder="Your permanent access token"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Generate in <strong>Meta Business Suite → Business Settings → System Users → Generate Token</strong>
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
                  Your WhatsApp Business phone number for display purposes
                </p>
              </div>

              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="text-sm font-medium mb-2">Where do I find these credentials?</p>
                <a
                  href="https://developers.facebook.com/docs/whatsapp/business-management-api/get-started#1--acquire-an-access-token-using-a-system-user-or-facebook-login"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                >
                  View Meta's Token Guide <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </>
          )}

          {step === "webhook" && (
            <>
              <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
                <p className="text-sm font-medium mb-2">
                  Go to your Meta Developer Portal and configure the webhook:
                </p>
                <p className="text-xs text-muted-foreground">
                  WhatsApp → Configuration → Webhook → Edit
                </p>
              </div>

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

                <div className="rounded-lg border bg-muted/50 p-4">
                  <p className="text-sm font-medium mb-2">Webhook Fields to Subscribe:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>✓ <strong>messages</strong> (required)</li>
                    <li>✓ message_deliveries (optional)</li>
                    <li>✓ message_reads (optional)</li>
                  </ul>
                </div>
              </div>
            </>
          )}
          
          <div className="flex justify-between gap-3 pt-2">
            <div>
              {step !== "intro" && (
                <Button
                  variant="ghost"
                  onClick={() => setStep(step === "webhook" ? "credentials" : "intro")}
                  disabled={isLoading}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              {step === "intro" && (
                <Button onClick={() => setStep("credentials")}>
                  Get Started
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
              {step === "credentials" && (
                <Button 
                  onClick={handleSaveCredentials}
                  disabled={isLoading || !phoneNumberId.trim() || !accessToken.trim()}
                >
                  {isLoading ? "Saving..." : "Next"}
                  {!isLoading && <ArrowRight className="h-4 w-4 ml-2" />}
                </Button>
              )}
              {step === "webhook" && (
                <Button onClick={handleComplete}>
                  Complete Setup
                  <CheckCircle2 className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
