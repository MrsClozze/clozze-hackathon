import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, Plus, X, Send, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDocuSignAuth } from "@/hooks/useDocuSignAuth";
import { useDocuSignEnvelopes } from "@/hooks/useDocuSignEnvelopes";
import docusignLogo from "@/assets/docusign-logo-new.png";

interface Recipient {
  name: string;
  email: string;
}

interface SendWithDocuSignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Pre-fill data from task/buyer/listing context
  defaultRecipients?: Recipient[];
  defaultSubject?: string;
  taskId?: string;
  buyerId?: string;
  listingId?: string;
  onSent?: (envelopeId: string) => void;
}

export function SendWithDocuSignModal({
  open,
  onOpenChange,
  defaultRecipients = [],
  defaultSubject = "",
  taskId,
  buyerId,
  listingId,
  onSent,
}: SendWithDocuSignModalProps) {
  const { isConnected, authenticate, isAuthenticating } = useDocuSignAuth();
  const { sendEnvelope } = useDocuSignEnvelopes();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [recipients, setRecipients] = useState<Recipient[]>(
    defaultRecipients.length > 0 ? defaultRecipients : [{ name: "", email: "" }]
  );
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);

  // Reset state when modal opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setRecipients(
        defaultRecipients.length > 0 ? defaultRecipients : [{ name: "", email: "" }]
      );
      setSubject(defaultSubject);
      setMessage("");
      setFile(null);
      setSending(false);
    }
    onOpenChange(isOpen);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.size > 25 * 1024 * 1024) {
        toast({ title: "File too large", description: "Maximum file size is 25MB", variant: "destructive" });
        return;
      }
      setFile(selected);
    }
  };

  const addRecipient = () => {
    setRecipients([...recipients, { name: "", email: "" }]);
  };

  const removeRecipient = (idx: number) => {
    if (recipients.length <= 1) return;
    setRecipients(recipients.filter((_, i) => i !== idx));
  };

  const updateRecipient = (idx: number, field: keyof Recipient, value: string) => {
    const updated = [...recipients];
    updated[idx] = { ...updated[idx], [field]: value };
    setRecipients(updated);
  };

  const handleSend = async () => {
    // Validate
    const validRecipients = recipients.filter(r => r.name.trim() && r.email.trim());
    if (validRecipients.length === 0) {
      toast({ title: "Recipients required", description: "Add at least one recipient with name and email", variant: "destructive" });
      return;
    }
    if (!file) {
      toast({ title: "Document required", description: "Please upload a document to send for signature", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      // Convert file to base64
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );

      const result = await sendEnvelope({
        documentBase64: base64,
        documentName: file.name,
        recipients: validRecipients,
        emailSubject: subject || `Please sign: ${file.name}`,
        emailBlurb: message || undefined,
        taskId,
        buyerId,
        listingId,
      });

      toast({
        title: "Document sent for signature",
        description: `Sent to ${validRecipients.map(r => r.name).join(", ")} via DocuSign`,
      });

      onSent?.(result?.envelopeId);
      onOpenChange(false);
    } catch (err) {
      console.error("Error sending DocuSign envelope:", err);
      toast({
        title: "Failed to send",
        description: err instanceof Error ? err.message : "Failed to send document for signature",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleConnect = async () => {
    await authenticate();
  };

  // Not connected view
  if (!isConnected) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Connect DocuSign</DialogTitle>
            <DialogDescription>
              Connect your DocuSign account to send documents for signature.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-5">
            <div className="flex justify-center">
              <img src={docusignLogo} alt="DocuSign" className="h-12 object-contain" />
            </div>
            <Button onClick={handleConnect} disabled={isAuthenticating} className="w-full">
              {isAuthenticating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Sign in with DocuSign
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <img src={docusignLogo} alt="DocuSign" className="h-5 object-contain" />
            Send with DocuSign
          </DialogTitle>
          <DialogDescription>
            Upload a document and send it for signature via DocuSign
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Document Upload */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Document</Label>
            {file ? (
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFile(null)}
                  className="flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors group"
              >
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground group-hover:text-primary transition-colors" />
                <p className="text-sm font-medium">Click to upload document</p>
                <p className="text-xs text-muted-foreground mt-1">PDF, DOC, DOCX (max 25MB)</p>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Email Subject */}
          <div>
            <Label className="text-sm font-medium mb-1.5 block">Email Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={file ? `Please sign: ${file.name}` : "Please sign the attached document"}
            />
          </div>

          {/* Message */}
          <div>
            <Label className="text-sm font-medium mb-1.5 block">Message (optional)</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Please review and sign the attached document."
              className="min-h-[80px]"
            />
          </div>

          {/* Recipients */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Recipients</Label>
              <Button variant="ghost" size="sm" onClick={addRecipient} className="h-7 text-xs gap-1">
                <Plus className="h-3 w-3" />
                Add
              </Button>
            </div>
            <div className="space-y-3">
              {recipients.map((r, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <Input
                      value={r.name}
                      onChange={(e) => updateRecipient(idx, "name", e.target.value)}
                      placeholder="Full name"
                    />
                    <Input
                      value={r.email}
                      onChange={(e) => updateRecipient(idx, "email", e.target.value)}
                      placeholder="Email address"
                      type="email"
                    />
                  </div>
                  {recipients.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRecipient(idx)}
                      className="flex-shrink-0 mt-1"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Send Button */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={sending || !file || recipients.every(r => !r.name.trim() || !r.email.trim())}
              className="flex-1 bg-primary text-primary-foreground"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send for Signature
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
