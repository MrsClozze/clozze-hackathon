import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mail, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface EmailImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EmailImportModal({ open, onOpenChange }: EmailImportModalProps) {
  const handleGoogleImport = () => {
    // Placeholder for Google Contacts import
    alert("Google Contacts import will be implemented with OAuth integration");
  };

  const handleOutlookImport = () => {
    // Placeholder for Outlook Contacts import
    alert("Outlook Contacts import will be implemented with Microsoft Graph API");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import Email Contacts</DialogTitle>
          <DialogDescription>
            Connect your email account to import contacts directly
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This feature requires OAuth authentication setup for secure access to your email contacts.
          </AlertDescription>
        </Alert>

        <div className="space-y-3 mt-4">
          <Button
            variant="outline"
            className="w-full justify-start gap-3"
            onClick={handleGoogleImport}
          >
            <Mail className="h-5 w-5" />
            Import from Gmail / Google Contacts
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start gap-3"
            onClick={handleOutlookImport}
          >
            <Mail className="h-5 w-5" />
            Import from Outlook / Microsoft
          </Button>
        </div>

        <div className="text-xs text-text-muted mt-4">
          Your email credentials are never stored. We only request read-only access to your contacts.
        </div>
      </DialogContent>
    </Dialog>
  );
}