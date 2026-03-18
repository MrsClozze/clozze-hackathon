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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, Plus, X, Send, FileText, ArrowLeft, ArrowRight, CheckCircle2, User, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDocuSignAuth } from "@/hooks/useDocuSignAuth";
import { useDocuSignEnvelopes } from "@/hooks/useDocuSignEnvelopes";
import docusignLogo from "@/assets/docusign-logo-new.png";

interface Recipient {
  name: string;
  email: string;
}

interface UploadedFile {
  file: File;
  base64: string;
}

interface SendWithDocuSignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultRecipients?: Recipient[];
  defaultSubject?: string;
  taskId?: string;
  buyerId?: string;
  listingId?: string;
  onSent?: (envelopeId: string) => void;
}

type ModalStep = "compose" | "review";

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

  const [step, setStep] = useState<ModalStep>("compose");
  const [recipients, setRecipients] = useState<Recipient[]>(
    defaultRecipients.length > 0 ? defaultRecipients : [{ name: "", email: "" }]
  );
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [sending, setSending] = useState(false);
  const [enableReminders, setEnableReminders] = useState(true);
  const [enableExpiration, setEnableExpiration] = useState(true);

  // Reset all state when the modal opens or when the client context changes
  useEffect(() => {
    if (open) {
      setRecipients(
        defaultRecipients.length > 0 ? [...defaultRecipients] : [{ name: "", email: "" }]
      );
      setSubject(defaultSubject);
      setMessage("");
      setFiles([]);
      setSending(false);
      setEnableReminders(true);
      setEnableExpiration(true);
      setStep("compose");
    }
  }, [open, buyerId, listingId, taskId]);

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const arrayBuffer = reader.result as ArrayBuffer;
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
        );
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const validFiles: UploadedFile[] = [];

    for (const file of selectedFiles) {
      if (file.size > 25 * 1024 * 1024) {
        toast({ title: "File too large", description: `${file.name} exceeds the 25MB limit`, variant: "destructive" });
        continue;
      }
      if (files.length + validFiles.length >= 10) {
        toast({ title: "Too many files", description: "Maximum of 10 documents per envelope", variant: "destructive" });
        break;
      }
      try {
        const base64 = await fileToBase64(file);
        validFiles.push({ file, base64 });
      } catch {
        toast({ title: "Error reading file", description: `Could not read ${file.name}`, variant: "destructive" });
      }
    }

    setFiles((prev) => [...prev, ...validFiles]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
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

  const validRecipients = recipients.filter(r => r.name.trim() && r.email.trim());
  const canProceedToReview = validRecipients.length > 0 && files.length > 0;
  const resolvedSubject = subject || (files.length > 0 ? `Please sign: ${files[0].file.name}` : "Please sign the attached document");

  const handleGoToReview = () => {
    if (!canProceedToReview) {
      if (files.length === 0) {
        toast({ title: "Document required", description: "Please upload at least one document to send for signature", variant: "destructive" });
      } else {
        toast({ title: "Recipients required", description: "Add at least one recipient with name and email", variant: "destructive" });
      }
      return;
    }
    setStep("review");
  };

  const handleSend = async () => {
    setSending(true);
    try {
      const documents = files.map((f, idx) => ({
        documentBase64: f.base64,
        documentName: f.file.name,
        documentId: String(idx + 1),
      }));

      const result = await sendEnvelope({
        documents,
        recipients: validRecipients,
        emailSubject: resolvedSubject,
        emailBlurb: message || undefined,
        taskId,
        buyerId,
        listingId,
        enableReminders,
        enableExpiration,
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

  // Not connected state
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

  // Review step
  if (step === "review") {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <img src={docusignLogo} alt="DocuSign" className="h-5 object-contain" />
              Review &amp; Send
            </DialogTitle>
            <DialogDescription>
              Please review the details below before sending for signature.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Documents summary */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-primary" />
                Documents ({files.length})
              </Label>
              <div className="space-y-1.5">
                {files.map((f, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                    <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{f.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(f.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs flex-shrink-0">
                      {f.file.name.split('.').pop()?.toUpperCase()}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Recipients summary */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <User className="h-4 w-4 text-primary" />
                Signers ({validRecipients.length})
              </Label>
              <div className="space-y-1.5">
                {validRecipients.map((r, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {r.email}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs flex-shrink-0">
                      Signer {idx + 1}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Email details */}
            <div className="space-y-2 p-3 rounded-lg border bg-muted/10">
              <Label className="text-sm font-medium">Email Details</Label>
              <div className="space-y-1">
                <p className="text-sm">
                  <span className="text-muted-foreground">Subject:</span>{" "}
                  {resolvedSubject}
                </p>
                {message && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Message:</span>{" "}
                    {message}
                  </p>
                )}
              </div>
            </div>

            {/* Notification summary */}
            <div className="space-y-2 p-3 rounded-lg border bg-muted/10">
              <Label className="text-sm font-medium">Notifications</Label>
              <div className="flex flex-wrap gap-2">
                {enableReminders && (
                  <Badge variant="outline" className="text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1 text-primary" />
                    Reminders (3-day delay, every 5 days)
                  </Badge>
                )}
                {enableExpiration && (
                  <Badge variant="outline" className="text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1 text-primary" />
                    Expires after 30 days
                  </Badge>
                )}
                {!enableReminders && !enableExpiration && (
                  <p className="text-xs text-muted-foreground">No automated notifications</p>
                )}
              </div>
            </div>

            {/* Signature placement info */}
            <div className="p-3 rounded-lg border border-accent bg-accent/20">
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Signature placement:</strong> A signature field will be automatically placed at the bottom of page 1 of each document. Signers can reposition or add additional fields during the signing process.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setStep("compose")} className="flex-1 gap-1.5">
                <ArrowLeft className="h-4 w-4" />
                Edit
              </Button>
              <Button
                onClick={handleSend}
                disabled={sending}
                className="flex-1 bg-primary text-primary-foreground gap-1.5"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send for Signature
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Compose step
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <img src={docusignLogo} alt="DocuSign" className="h-5 object-contain" />
            Send with DocuSign
          </DialogTitle>
          <DialogDescription>
            Upload documents and send them for signature via DocuSign
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Document Upload */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Documents {files.length > 0 && `(${files.length})`}
            </Label>

            {files.length > 0 && (
              <div className="space-y-2 mb-3">
                {files.map((f, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                    <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{f.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(f.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeFile(idx)} className="flex-shrink-0">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {files.length < 10 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors group"
              >
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground group-hover:text-primary transition-colors" />
                <p className="text-sm font-medium">
                  {files.length === 0 ? "Click to upload document(s)" : "Add another document"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">PDF, DOC, DOCX (max 25MB each, up to 10 files)</p>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              multiple
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
              placeholder={files.length > 0 ? `Please sign: ${files[0].file.name}` : "Please sign the attached document"}
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

          {/* Notification Settings */}
          <div className="space-y-3 p-3 rounded-lg border bg-muted/10">
            <Label className="text-sm font-medium">Notification Settings</Label>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Reminders</p>
                <p className="text-xs text-muted-foreground">Send reminder after 3 days, then every 5 days</p>
              </div>
              <Switch checked={enableReminders} onCheckedChange={setEnableReminders} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Expiration</p>
                <p className="text-xs text-muted-foreground">Expire after 30 days, warn 3 days before</p>
              </div>
              <Switch checked={enableExpiration} onCheckedChange={setEnableExpiration} />
            </div>
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

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleGoToReview}
              disabled={!canProceedToReview}
              className="flex-1 bg-primary text-primary-foreground gap-1.5"
            >
              Review
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
