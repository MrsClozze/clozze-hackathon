import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Loader2, FileText, Check, AlertCircle, Search, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDocuSignAuth } from "@/hooks/useDocuSignAuth";
import docusignLogo from "@/assets/docusign-logo-new.png";

interface DocuSignImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importType: "listing" | "buyer";
  onImport: (data: any) => void;
}

interface DocuSignEnvelope {
  envelopeId: string;
  subject: string;
  status: string;
  statusChangedDateTime: string;
  sentDateTime: string;
  completedDateTime: string;
  createdDateTime: string;
}

export function DocuSignImportModal({
  open,
  onOpenChange,
  importType,
  onImport,
}: DocuSignImportModalProps) {
  const [loading, setLoading] = useState(false);
  const [envelopes, setEnvelopes] = useState<DocuSignEnvelope[]>([]);
  const [selectedEnvelope, setSelectedEnvelope] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [importing, setImporting] = useState(false);
  const { toast } = useToast();
  const { isConnected, authenticate, isAuthenticating } = useDocuSignAuth();

  useEffect(() => {
    if (open && isConnected) {
      fetchEnvelopes();
    }
    if (open) {
      setSearchQuery("");
      setSelectedEnvelope(null);
    }
  }, [open, isConnected]);

  const fetchEnvelopes = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Please sign in to continue");
        setLoading(false);
        return;
      }

      const response = await supabase.functions.invoke("sync-docusign", {
        body: { action: "fetch_envelopes" },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.error) throw new Error(response.error.message);

      const data = response.data?.data;
      setEnvelopes(data?.envelopes || []);
    } catch (err) {
      console.error("Error fetching DocuSign envelopes:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch envelopes");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!selectedEnvelope) return;

    setImporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("sync-docusign", {
        body: { action: "fetch_envelope_details", envelopeId: selectedEnvelope },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.error) throw new Error(response.error.message);

      const envelope = response.data?.data?.envelope;
      if (!envelope) throw new Error("No envelope details returned");

      // Extract signer info for import
      const firstSigner = envelope.signers?.[0];

      if (importType === "listing") {
        onImport({
          sellerFirstName: firstSigner?.name?.split(" ")[0] || "",
          sellerLastName: firstSigner?.name?.split(" ").slice(1).join(" ") || "",
          sellerEmail: firstSigner?.email || "",
        });
      } else {
        onImport({
          buyerFirstName: firstSigner?.name?.split(" ")[0] || "",
          buyerLastName: firstSigner?.name?.split(" ").slice(1).join(" ") || "",
          buyerEmail: firstSigner?.email || "",
        });
      }

      toast({
        title: "Envelope imported",
        description: `Imported "${envelope.subject}" from DocuSign`,
      });
      onOpenChange(false);
    } catch (err) {
      console.error("Error importing envelope:", err);
      toast({
        title: "Import failed",
        description: err instanceof Error ? err.message : "Failed to import",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  const handleConnect = async () => {
    const success = await authenticate();
    if (success) {
      fetchEnvelopes();
    }
  };

  const filteredEnvelopes = envelopes.filter((e) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return e.subject?.toLowerCase().includes(q) || e.status?.toLowerCase().includes(q);
  });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "text-success";
      case "sent": return "text-primary";
      case "delivered": return "text-blue-400";
      case "voided": return "text-destructive";
      default: return "text-muted-foreground";
    }
  };

  // Not connected view
  if (!isConnected) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Connect DocuSign</DialogTitle>
            <DialogDescription>
              Connect your DocuSign account to import {importType === "listing" ? "listing agreements" : "buyer agreements"}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-5">
            <div className="flex justify-center">
              <img src={docusignLogo} alt="DocuSign" className="h-12 object-contain" />
            </div>
            <Button onClick={handleConnect} disabled={isAuthenticating} className="w-full">
              {isAuthenticating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ExternalLink className="h-4 w-4 mr-2" />
              )}
              Sign in with DocuSign
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Connected - import view
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import from DocuSign</DialogTitle>
          <DialogDescription>
            Select an envelope to import signer details as a {importType === "listing" ? "listing" : "buyer"}.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">Loading from DocuSign...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-10 w-10 text-destructive mb-4" />
              <p className="text-sm text-destructive mb-4">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchEnvelopes}>Retry</Button>
            </div>
          ) : envelopes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No envelopes found in DocuSign</p>
            </div>
          ) : (
            <>
              {envelopes.length > 5 && (
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search envelopes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              )}
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {filteredEnvelopes.map((envelope) => (
                    <button
                      key={envelope.envelopeId}
                      onClick={() => setSelectedEnvelope(envelope.envelopeId)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        selectedEnvelope === envelope.envelopeId
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{envelope.subject}</p>
                            <p className="text-xs text-muted-foreground">
                              <span className={getStatusColor(envelope.status)}>
                                {envelope.status}
                              </span>
                              {" • "}
                              {formatDate(envelope.completedDateTime || envelope.sentDateTime || envelope.createdDateTime)}
                            </p>
                          </div>
                        </div>
                        {selectedEnvelope === envelope.envelopeId && (
                          <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                  {filteredEnvelopes.length === 0 && searchQuery && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No results for "{searchQuery}"
                    </p>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </div>

        {!loading && !error && envelopes.length > 0 && (
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleImport} disabled={!selectedEnvelope || importing} className="flex-1">
              {importing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Import Selected
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
