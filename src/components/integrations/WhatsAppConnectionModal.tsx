import React, { useState } from "react";
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

interface WhatsAppConnectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function WhatsAppConnectionModal({
  open,
  onOpenChange,
  onSuccess,
}: WhatsAppConnectionModalProps) {
  const [step, setStep] = useState<"phone" | "verify">("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [devCode, setDevCode] = useState("");
  const { toast } = useToast();

  const handleSendCode = async () => {
    if (!phoneNumber.trim()) {
      toast({
        title: "Phone number required",
        description: "Please enter your WhatsApp phone number",
        variant: "destructive",
      });
      return;
    }

    // Basic phone number validation
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phoneNumber.replace(/[\s-]/g, ""))) {
      toast({
        title: "Invalid phone number",
        description: "Please enter a valid phone number with country code",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp-verification', {
        body: { phoneNumber }
      });

      if (error) throw error;

      // Store dev code for demo purposes
      if (data?.devCode) {
        setDevCode(data.devCode);
      }

      toast({
        title: "Code sent!",
        description: "Check your WhatsApp for the verification code",
      });
      setStep("verify");
    } catch (error: any) {
      toast({
        title: "Failed to send code",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!verificationCode.trim()) {
      toast({
        title: "Code required",
        description: "Please enter the verification code",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('verify-whatsapp-code', {
        body: { code: verificationCode }
      });

      if (error) throw error;

      toast({
        title: "WhatsApp connected!",
        description: "Your WhatsApp account has been successfully linked",
      });
      
      // Reset form
      setPhoneNumber("");
      setVerificationCode("");
      setDevCode("");
      setStep("phone");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      const errorMessage = error.message || "Invalid code. Please try again";
      const isExpired = errorMessage.toLowerCase().includes('expired');
      
      toast({
        title: "Verification failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      // If code expired, go back to phone entry to request new code
      if (isExpired) {
        setTimeout(() => {
          setStep("phone");
          setVerificationCode("");
        }, 2000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setPhoneNumber("");
    setVerificationCode("");
    setDevCode("");
    setStep("phone");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === "phone" ? "Connect WhatsApp" : "Verify Your Number"}
          </DialogTitle>
          <DialogDescription>
            {step === "phone" 
              ? "Enter your WhatsApp phone number to receive a verification code."
              : "Enter the 6-digit code we sent to your WhatsApp."}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {step === "phone" ? (
            <div className="space-y-2">
              <Label htmlFor="phone">WhatsApp Phone Number</Label>
              <Input
                id="phone"
                placeholder="+1 234 567 8900"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={isLoading}
                onKeyDown={(e) => e.key === 'Enter' && handleSendCode()}
              />
              <p className="text-xs text-muted-foreground">
                Include country code (e.g., +1 for US, +44 for UK)
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="code">Verification Code</Label>
                <Input
                  id="code"
                  placeholder="123456"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  disabled={isLoading}
                  maxLength={6}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                />
                <p className="text-xs text-muted-foreground">
                  Code expires in 15 minutes
                </p>
              </div>
              {devCode && (
                <div className="rounded-lg border-2 border-primary bg-primary/10 p-4">
                  <p className="text-sm font-semibold text-foreground mb-2">
                    🔐 Development Mode - Use This Code:
                  </p>
                  <p className="text-2xl font-mono font-bold text-primary text-center tracking-widest">
                    {devCode}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    In production, this would be sent via WhatsApp
                  </p>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep("phone")}
                disabled={isLoading}
                className="w-full"
              >
                Use a different number
              </Button>
            </>
          )}
          
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              onClick={step === "phone" ? handleSendCode : handleVerify}
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : step === "phone" ? "Send Code" : "Verify"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
