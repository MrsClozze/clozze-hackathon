import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { QrCode, Smartphone } from "lucide-react";

interface PhoneImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PhoneImportModal({ open, onOpenChange }: PhoneImportModalProps) {
  // In production, generate a unique QR code with session token
  const qrCodePlaceholder = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=clozze-sync-contacts";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import Phone Contacts</DialogTitle>
          <DialogDescription>
            Scan this QR code with your phone to securely sync contacts
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-4 py-6">
          <div className="p-4 bg-background rounded-lg border-2 border-card-border">
            <img
              src={qrCodePlaceholder}
              alt="QR Code"
              className="w-48 h-48"
            />
          </div>

          <div className="flex items-center gap-2 text-text-muted">
            <Smartphone className="h-4 w-4" />
            <span className="text-sm">Open your camera app and scan the code</span>
          </div>
        </div>

        <div className="space-y-2 text-xs text-text-muted">
          <p className="flex items-start gap-2">
            <QrCode className="h-4 w-4 flex-shrink-0 mt-0.5" />
            This QR code expires in 5 minutes for security
          </p>
          <p>Your contacts are encrypted during transfer and never stored on our servers</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}