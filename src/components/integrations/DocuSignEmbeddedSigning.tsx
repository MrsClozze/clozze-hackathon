import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink, CheckCircle2, XCircle } from "lucide-react";
import docusignLogo from "@/assets/docusign-logo-new.png";

interface DocuSignEmbeddedSigningProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  signingUrl: string | null;
  signerName: string;
  loading?: boolean;
  onSigningComplete?: () => void;
}

export function DocuSignEmbeddedSigning({
  open,
  onOpenChange,
  signingUrl,
  signerName,
  loading = false,
  onSigningComplete,
}: DocuSignEmbeddedSigningProps) {
  const [signingStatus, setSigningStatus] = useState<"loading" | "signing" | "completed" | "declined" | null>("loading");

  useEffect(() => {
    if (open && signingUrl) {
      setSigningStatus("signing");
    } else if (open) {
      setSigningStatus("loading");
    }
  }, [open, signingUrl]);

  // Listen for redirect events from the DocuSign iframe
  useEffect(() => {
    if (!open) return;

    const handleMessage = (event: MessageEvent) => {
      // DocuSign sends postMessage events with signing status
      if (event.data?.event === "signing_complete") {
        setSigningStatus("completed");
        onSigningComplete?.();
      } else if (event.data?.event === "decline") {
        setSigningStatus("declined");
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [open, onSigningComplete]);

  const handleOpenExternal = () => {
    if (signingUrl) {
      window.open(signingUrl, "_blank");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle className="flex items-center gap-2">
            <img src={docusignLogo} alt="DocuSign" className="h-5 object-contain" />
            Embedded Signing — {signerName}
          </DialogTitle>
          <DialogDescription>
            {signingStatus === "signing" && "The signer can review and sign the document below."}
            {signingStatus === "completed" && "The document has been successfully signed."}
            {signingStatus === "declined" && "The signer declined to sign the document."}
            {signingStatus === "loading" && "Preparing the signing session..."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 px-6 pb-6">
          {loading || signingStatus === "loading" ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Generating signing session...
              </p>
            </div>
          ) : signingStatus === "completed" ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <h3 className="text-lg font-semibold">Signing Complete</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                {signerName} has successfully signed the document. The signed
                copy will be available for download once all signers have
                completed.
              </p>
              <Button onClick={() => onOpenChange(false)}>Close</Button>
            </div>
          ) : signingStatus === "declined" ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <XCircle className="h-16 w-16 text-destructive" />
              <h3 className="text-lg font-semibold">Signing Declined</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                {signerName} has declined to sign the document.
              </p>
              <Button onClick={() => onOpenChange(false)}>Close</Button>
            </div>
          ) : signingUrl ? (
            <div className="h-full flex flex-col gap-2">
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleOpenExternal}
                  className="gap-1.5 text-xs"
                >
                  <ExternalLink className="h-3 w-3" />
                  Open in new tab
                </Button>
              </div>
              <iframe
                src={signingUrl}
                className="flex-1 w-full rounded-lg border"
                title="DocuSign Signing"
                allow="camera; microphone"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <p className="text-sm text-muted-foreground">
                Unable to load the signing session. Please try again.
              </p>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
