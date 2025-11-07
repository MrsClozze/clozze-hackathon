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
import { useIntegrations } from "@/contexts/IntegrationsContext";

interface WhatsAppConnectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WhatsAppConnectionModal({
  open,
  onOpenChange,
}: WhatsAppConnectionModalProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const { connectWhatsApp } = useIntegrations();
  const { toast } = useToast();

  const handleConnect = async () => {
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

    setIsConnecting(true);
    
    // Simulate API call
    setTimeout(() => {
      connectWhatsApp(phoneNumber);
      setIsConnecting(false);
      onOpenChange(false);
      toast({
        title: "WhatsApp connected!",
        description: "Your WhatsApp account has been successfully linked",
      });
      setPhoneNumber("");
    }, 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect WhatsApp</DialogTitle>
          <DialogDescription>
            Enter your WhatsApp phone number to connect your account. Make sure to include your country code.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="phone">WhatsApp Phone Number</Label>
            <Input
              id="phone"
              placeholder="+1 234 567 8900"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={isConnecting}
            />
            <p className="text-xs text-muted-foreground">
              Include country code (e.g., +1 for US, +44 for UK)
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isConnecting}
            >
              Cancel
            </Button>
            <Button onClick={handleConnect} disabled={isConnecting}>
              {isConnecting ? "Connecting..." : "Connect"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
