import { useDocuSignEnvelopes, DocuSignEnvelope } from "@/hooks/useDocuSignEnvelopes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, FileText, Loader2, Download } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import docusignLogo from "@/assets/docusign-logo-new.png";

interface DocuSignEnvelopeStatusProps {
  taskId?: string;
  buyerId?: string;
  listingId?: string;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  sent: { label: "Sent", variant: "default" },
  delivered: { label: "Delivered", variant: "default" },
  completed: { label: "Signed", variant: "secondary" },
  declined: { label: "Declined", variant: "destructive" },
  voided: { label: "Voided", variant: "destructive" },
  created: { label: "Created", variant: "outline" },
};

export function DocuSignEnvelopeStatus({ taskId, buyerId, listingId }: DocuSignEnvelopeStatusProps) {
  const { envelopes, loading, refreshStatus, downloadSignedDocument } = useDocuSignEnvelopes({ taskId, buyerId, listingId });
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const { toast } = useToast();

  if (loading || envelopes.length === 0) return null;

  const handleRefresh = async (envelopeId: string) => {
    setRefreshingId(envelopeId);
    try {
      await refreshStatus(envelopeId);
    } finally {
      setRefreshingId(null);
    }
  };

  const handleDownload = async (env: DocuSignEnvelope) => {
    setDownloadingId(env.envelope_id);
    try {
      const blob = await downloadSignedDocument(env.envelope_id);
      if (!blob) {
        toast({ title: "Download failed", description: "Could not retrieve the signed document", variant: "destructive" });
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${env.document_name || env.subject || "signed-document"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Download complete", description: "Signed document has been downloaded" });
    } catch (err) {
      console.error("Download error:", err);
      toast({ title: "Download failed", description: err instanceof Error ? err.message : "Could not download document", variant: "destructive" });
    } finally {
      setDownloadingId(null);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <img src={docusignLogo} alt="DocuSign" className="h-4 object-contain" />
        <span className="text-xs font-medium text-muted-foreground">DocuSign Envelopes</span>
      </div>
      {envelopes.map((env) => {
        const config = statusConfig[env.status] || { label: env.status, variant: "outline" as const };
        return (
          <div
            key={env.id}
            className="flex items-center gap-2 p-2.5 rounded-lg border bg-muted/20 text-sm"
          >
            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate text-xs">{env.document_name || env.subject}</p>
              <p className="text-xs text-muted-foreground">
                {env.sent_at ? formatDate(env.sent_at) : formatDate(env.created_at)}
                {env.recipients && Array.isArray(env.recipients) && env.recipients.length > 0 && (
                  <> • {(env.recipients as any[]).map((r: any) => r.name).join(", ")}</>
                )}
              </p>
            </div>
            <Badge variant={config.variant} className="text-xs flex-shrink-0">
              {config.label}
            </Badge>
            {env.status === "completed" && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 flex-shrink-0"
                onClick={() => handleDownload(env)}
                disabled={downloadingId === env.envelope_id}
                title="Download signed document"
              >
                {downloadingId === env.envelope_id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Download className="h-3 w-3" />
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 flex-shrink-0"
              onClick={() => handleRefresh(env.envelope_id)}
              disabled={refreshingId === env.envelope_id}
            >
              {refreshingId === env.envelope_id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
