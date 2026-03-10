import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FileDropZone } from "@/components/ui/file-drop-zone";
import docusignLogo from "@/assets/docusign-logo-new.png";
import followUpBossLogo from "@/assets/follow-up-boss-logo.png";
import dotloopLogo from "@/assets/dotloop-logo.png";
import { useDocuSignAuth } from "@/hooks/useDocuSignAuth";
import { FollowUpBossImportModal } from "@/components/integrations/FollowUpBossImportModal";
import { DotloopImportModal } from "@/components/integrations/DotloopImportModal";

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

  const handleClose = () => {
    setView("upload");
    setParsedData(null);
    onOpenChange(false);
  };

  const handleFileUpload = async (file: File) => {
    console.log("Processing file:", file.name);
    
    setView("processing");

    // Simulate AI parsing
    setTimeout(() => {
      const mockData: ParsedData = {
        type: file.name.toLowerCase().includes("buyer") ? "buyer" : "listing",
        fileName: file.name,
        uploadedAt: new Date().toISOString(),
        ...(file.name.toLowerCase().includes("buyer") ? {
          firstName: "John",
          lastName: "Smith",
          email: "john.smith@email.com",
          phone: "(555) 123-4567",
          preApprovedAmount: 450000,
          wantsNeeds: "3-bedroom house with yard, near good schools",
          brokerageName: "Premier Realty",
          brokerageAddress: "123 Main St",
          agentName: "Current User",
          agentEmail: "agent@realty.com",
          commissionPercentage: 3.0,
        } : {
          sellerFirstName: "Jane",
          sellerLastName: "Doe",
          sellerEmail: "jane.doe@email.com",
          sellerPhone: "(555) 987-6543",
          address: "456 Oak Avenue",
          city: "Beverly Hills",
          zipcode: "90210",
          county: "Los Angeles",
          bedrooms: 4,
          bathrooms: 3.5,
          sqFeet: 3200,
          listingPrice: 2450000,
          appraisalPrice: 2400000,
          multiUnit: false,
          listingStartDate: new Date().toISOString().split('T')[0],
          listingEndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          brokerageName: "Luxury Properties Inc",
          brokerageAddress: "789 Sunset Blvd",
          agentName: "Current User",
          agentEmail: "agent@luxury.com",
          commissionPercentage: 6.0,
        }),
      };
      
      setParsedData(mockData);
      setView("review");
      
      toast({
        title: "Document Parsed Successfully",
        description: "Please review the extracted information below.",
      });
    }, 3000);
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

  const handleConfirmAndCreate = () => {
    if (!parsedData) return;

    const tasks = parsedData.type ? defaultTasks[parsedData.type] : [];
    
    console.log("Creating card with data:", parsedData);
    console.log("Auto-populated tasks:", tasks);

    toast({
      title: `${parsedData.type === 'buyer' ? 'Buyer' : 'Listing'} Card Created`,
      description: `Successfully created with ${tasks.length} automated tasks.`,
    });

    handleClose();
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