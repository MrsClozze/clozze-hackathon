import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FileDropZone } from "@/components/ui/file-drop-zone";
import docusignLogo from "@/assets/docusign-logo-new.png";
import followUpBossLogo from "@/assets/follow-up-boss-logo.png";
import dotloopLogo from "@/assets/dotloop-logo.png";
import { useDocuSignAuth } from "@/hooks/useDocuSignAuth";
import { FollowUpBossImportModal } from "@/components/integrations/FollowUpBossImportModal";
import { DotloopImportModal } from "@/components/integrations/DotloopImportModal";
import { useDocumentParser } from "@/hooks/useDocumentParser";
import { useListings } from "@/contexts/ListingsContext";
import { useBuyers } from "@/contexts/BuyersContext";
import { useTasks } from "@/contexts/TasksContext";
import { useAuth } from "@/contexts/AuthContext";

interface UploadFileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ModalView = "choice" | "upload" | "processing" | "review";
type DocumentType = "listing" | "buyer" | null;

interface ParsedData {
  type: DocumentType;
  [key: string]: any;
}

const defaultTasks = {
  listing: [
    { title: "Schedule professional photography", priority: "high", category: "marketing" },
    { title: "Order title search", priority: "high", category: "legal" },
    { title: "Create listing description", priority: "medium", category: "marketing" },
    { title: "Set up MLS listing", priority: "high", category: "listing" },
    { title: "Schedule open house", priority: "medium", category: "showing" },
  ],
  buyer: [
    { title: "Verify pre-approval status", priority: "high", category: "financing" },
    { title: "Schedule first property showing", priority: "high", category: "showing" },
    { title: "Send property recommendations", priority: "medium", category: "research" },
    { title: "Prepare buyer presentation", priority: "medium", category: "admin" },
    { title: "Schedule buyer consultation", priority: "high", category: "meeting" },
  ],
};

export default function UploadFileModal({ open, onOpenChange }: UploadFileModalProps) {
  const [view, setView] = useState<ModalView>("upload");
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [fubModalOpen, setFubModalOpen] = useState(false);
  const [dotloopModalOpen, setDotloopModalOpen] = useState(false);
  const { toast } = useToast();
  const { authenticate, isAuthenticating } = useDocuSignAuth();
  const { parseListingDocument, parseBuyerDocument, isParsing } = useDocumentParser();
  const { addListing } = useListings();
  const { addBuyer } = useBuyers();

  const handleClose = () => {
    setView("upload");
    setParsedData(null);
    onOpenChange(false);
  };

  const handleFileUpload = async (file: File) => {
    console.log("Processing file:", file.name);
    setView("processing");

    // Try listing parse first; if filename hints at buyer, parse as buyer
    const isBuyerFile = file.name.toLowerCase().includes("buyer");
    
    try {
      if (isBuyerFile) {
        const result = await parseBuyerDocument(file);
        if (result.success && result.data) {
          setParsedData({
            type: "buyer",
            fileName: file.name,
            ...result.data,
          });
          setView("review");
          toast({
            title: "Document Parsed Successfully",
            description: "Please review the extracted information below.",
          });
          return;
        }
      }
      
      // Default: parse as listing
      const result = await parseListingDocument(file);
      if (result.success && result.data) {
        setParsedData({
          type: "listing",
          fileName: file.name,
          ...result.data,
        });
        setView("review");
        toast({
          title: "Document Parsed Successfully",
          description: "Please review the extracted information below.",
        });
        return;
      }

      // If parsing returned no data, show error
      setView("upload");
      toast({
        title: "Parsing Failed",
        description: result.error || "Could not extract data from the document. Please try again.",
        variant: "destructive",
      });
    } catch (err) {
      console.error("Document parsing error:", err);
      setView("upload");
      toast({
        title: "Parsing Error",
        description: err instanceof Error ? err.message : "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  const handleDocuSignUpload = async () => {
    const result = await authenticate();
    if (result) {
      console.log('DocuSign authenticated:', result);
    }
  };

  const handleFubImport = (data: any) => {
    // Determine type based on imported data shape
    const isBuyer = data.buyerFirstName || data.firstName;
    const parsedResult: ParsedData = {
      type: isBuyer ? "buyer" : "listing",
      ...(isBuyer ? {
        firstName: data.buyerFirstName || data.firstName || "",
        lastName: data.buyerLastName || data.lastName || "",
        email: data.buyerEmail || data.email || "",
        phone: data.buyerPhone || data.phone || "",
      } : {
        address: data.address || "",
        city: data.city || "",
        zipcode: data.zipcode || "",
        listingPrice: data.listingPrice || "",
      }),
    };

    setParsedData(parsedResult);
    setView("review");
  };

  const handleDotloopImport = (data: any) => {
    const isBuyer = data.buyerFirstName || data.firstName;
    const parsedResult: ParsedData = {
      type: isBuyer ? "buyer" : "listing",
      ...(isBuyer ? {
        firstName: data.buyerFirstName || data.firstName || "",
        lastName: data.buyerLastName || data.lastName || "",
        email: data.buyerEmail || data.email || "",
        phone: data.buyerPhone || data.phone || "",
      } : {
        address: data.address || "",
        city: data.city || "",
        zipcode: data.zipcode || "",
        listingPrice: data.listingPrice || data.price || "",
      }),
    };

    setParsedData(parsedResult);
    setView("review");
  };

  const handleConfirmAndCreate = async () => {
    if (!parsedData) return;

    try {
      if (parsedData.type === "listing") {
        const price = parseFloat(String(parsedData.listingPrice || parsedData.price || "0").replace(/[^0-9.]/g, "")) || 0;
        const commissionPct = parseFloat(String(parsedData.commissionPercentage || "0").replace(/[^0-9.]/g, "")) || 0;
        const agentCommission = price * (commissionPct / 100);

        await addListing({
          address: parsedData.address || "",
          city: parsedData.city || "",
          price,
          status: "Active",
          daysOnMarket: 0,
          commission: agentCommission,
          image: "",
          sellerFirstName: parsedData.sellerFirstName || parsedData.sellerName?.split(" ")[0] || "",
          sellerLastName: parsedData.sellerLastName || parsedData.sellerName?.split(" ").slice(1).join(" ") || "",
          sellerEmail: parsedData.sellerEmail || "",
          sellerPhone: parsedData.sellerPhone || "",
          zipcode: parsedData.zipcode || parsedData.zip || "",
          county: parsedData.county || "",
          bedrooms: parseInt(parsedData.bedrooms) || 0,
          bathrooms: parseInt(parsedData.bathrooms) || 0,
          sqFeet: parseInt(String(parsedData.sqFeet || parsedData.squareFeet || "0").replace(/[^0-9]/g, "")) || 0,
          appraisalPrice: 0,
          multiUnit: "no",
          listingStartDate: parsedData.listingStartDate || "",
          listingEndDate: parsedData.listingEndDate || "",
          brokerageName: parsedData.brokerageName || "",
          brokerageAddress: parsedData.brokerageAddress || "",
          agentName: parsedData.agentName || "",
          agentEmail: parsedData.agentEmail || "",
          commissionPercentage: commissionPct,
          totalCommission: agentCommission * 2,
          agentCommission,
          brokerageCommission: agentCommission,
        });
      } else if (parsedData.type === "buyer") {
        await addBuyer({
          firstName: parsedData.firstName || parsedData.buyerFirstName || "",
          lastName: parsedData.lastName || parsedData.buyerLastName || "",
          email: parsedData.email || parsedData.buyerEmail || "",
          phone: parsedData.phone || parsedData.buyerPhone || "",
          description: "",
          status: "Active",
          image: "",
          preApprovedAmount: parseFloat(String(parsedData.preApprovedAmount || "0").replace(/[^0-9.]/g, "")) || 0,
          wantsNeeds: parsedData.wantsNeeds || "",
          brokerageName: "",
          brokerageAddress: "",
          agentName: "",
          agentEmail: "",
          commissionPercentage: 0,
          totalCommission: 0,
          agentCommission: 0,
          brokerageCommission: 0,
        });
      }

      handleClose();
    } catch (error) {
      console.error("Error creating card:", error);
      toast({
        title: "Error",
        description: "Failed to create card. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {view === "upload" && "Upload Document"}
              {view === "processing" && "Processing Document"}
              {view === "review" && "Review Extracted Data"}
            </DialogTitle>
          </DialogHeader>

          {view === "upload" && (
            <div className="space-y-6 py-6">
              {/* Direct Upload */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Direct Upload</h3>
                <FileDropZone
                  id="file-upload-direct"
                  onFileSelect={handleFileUpload}
                  accept=".pdf,.doc,.docx"
                />
              </div>

              {/* Integration Options */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Load from the following apps</h3>
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    variant="outline"
                    className="h-20 bg-secondary border-border hover:bg-primary/10 hover:border-primary/40 transition-all"
                    onClick={handleDocuSignUpload}
                    disabled={isAuthenticating}
                  >
                    <img src={docusignLogo} alt="DocuSign" className="h-10 object-contain" />
                  </Button>
                  <Button
                    variant="outline"
                    className="h-20 bg-secondary border-border hover:bg-primary/10 hover:border-primary/40 transition-all"
                    onClick={() => setFubModalOpen(true)}
                  >
                    <img src={followUpBossLogo} alt="Follow Up Boss" className="h-10 object-contain" />
                  </Button>
                  <Button
                    variant="outline"
                    className="h-20 bg-secondary border-border hover:bg-primary/10 hover:border-primary/40 transition-all"
                    onClick={() => setDotloopModalOpen(true)}
                  >
                    <img src={dotloopLogo} alt="Dotloop" className="h-10 object-contain" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {view === "processing" && (
            <div className="py-16 text-center">
              <Loader2 className="h-16 w-16 mx-auto mb-6 text-accent-gold animate-spin" />
              <h3 className="text-xl font-semibold mb-2">Processing Document</h3>
              <p className="text-muted-foreground mb-4">
                AI is extracting information from your document...
              </p>
              <div className="w-64 h-2 bg-secondary rounded-full mx-auto overflow-hidden">
                <div className="h-full bg-accent-gold rounded-full animate-[pulse_1.5s_ease-in-out_infinite]" style={{ width: "60%" }}></div>
              </div>
            </div>
          )}

          {view === "review" && parsedData && (
            <div className="space-y-6 py-4">
              <div className="bg-success/10 border border-success/20 rounded-lg p-4 flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-success mb-1">Data Imported Successfully</p>
                  <p className="text-sm text-muted-foreground">
                    Please double check contents. You will be able to edit all details once the card is uploaded.
                  </p>
                </div>
              </div>

              <div className="border border-border rounded-lg p-6 space-y-4 bg-card">
                <h3 className="text-lg font-semibold text-text-heading mb-4">
                  {parsedData.type === "buyer" ? "Buyer Information" : "Listing Information"}
                </h3>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {Object.entries(parsedData).map(([key, value]) => {
                    if (key === "type" || key === "fileName" || key === "uploadedAt") return null;
                    return (
                      <div key={key} className="space-y-1">
                        <p className="text-muted-foreground capitalize">
                          {key.replace(/([A-Z])/g, " $1").trim()}
                        </p>
                        <p className="font-medium text-text-heading">
                          {typeof value === "boolean" ? (value ? "Yes" : "No") : value?.toString() || "N/A"}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-4 border-t border-border">
                  <p className="text-sm font-semibold mb-2">Auto-Generated Tasks ({defaultTasks[parsedData.type || "buyer"].length})</p>
                  <ul className="space-y-2">
                    {defaultTasks[parsedData.type || "buyer"].map((task, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-gold"></span>
                        {task.title}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={handleClose} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleConfirmAndCreate} className="flex-1">
                  Confirm and Create Card
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <FollowUpBossImportModal
        open={fubModalOpen}
        onOpenChange={setFubModalOpen}
        importType="buyer"
        onImport={handleFubImport}
      />

      <DotloopImportModal
        open={dotloopModalOpen}
        onOpenChange={setDotloopModalOpen}
        importType="listing"
        onImport={handleDotloopImport}
      />
    </>
  );
}