import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, Check, ExternalLink } from "lucide-react";
import { useGmailConnection } from "@/hooks/useGmailConnection";
import gmailLogo from "@/assets/gmail-logo.webp";

interface GmailConnectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function GmailConnectionModal({ 
  open, 
  onOpenChange,
  onSuccess 
}: GmailConnectionModalProps) {
  const { connectGmail, isConnecting } = useGmailConnection();

  const handleConnect = async () => {
    await connectGmail();
    // The page will redirect to Google OAuth, so we don't need to close the modal
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <img src={gmailLogo} alt="Gmail" className="w-10 h-10" />
            <DialogTitle>Connect Gmail</DialogTitle>
          </div>
          <DialogDescription>
            Connect your Gmail account to sync your emails and communication with Clozze.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-sm">What you'll get:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                <span>View your emails directly in Clozze</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                <span>AI-powered email suggestions and responses</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                <span>Track client communications automatically</span>
              </li>
            </ul>
          </div>

          <div className="text-xs text-muted-foreground">
            <p>We use secure OAuth authentication. Your credentials are never stored on our servers.</p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConnect} disabled={isConnecting}>
            {isConnecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Connect with Google
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
