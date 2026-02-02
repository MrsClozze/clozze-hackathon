import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ContactSelect } from "@/components/ui/contact-select";
import { FileDropZone } from "@/components/ui/file-drop-zone";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBuyers } from "@/contexts/BuyersContext";
import docusignLogo from "@/assets/docusign-logo-new.png";
import followUpBossLogo from "@/assets/follow-up-boss-logo.png";
import dotloopLogo from "@/assets/dotloop-logo.png";
import { useDocuSignAuth } from "@/hooks/useDocuSignAuth";

interface AddBuyerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ModalView = "upload" | "processing" | "manual";

interface FormData {
  buyerFirstName: string;
  buyerLastName: string;
  buyerEmail: string;
  buyerPhone: string;
  preApprovedAmount: string;
  wantsNeeds: string;
  brokerageName: string;
  brokerageAddress: string;
  agentEmail: string;
  commissionPercentage: string;
}

const emptyFormData: FormData = {
  buyerFirstName: "",
  buyerLastName: "",
  buyerEmail: "",
  buyerPhone: "",
  preApprovedAmount: "",
  wantsNeeds: "",
  brokerageName: "",
  brokerageAddress: "",
  agentEmail: "",
  commissionPercentage: "",
};

export default function AddBuyerModal({ open, onOpenChange }: AddBuyerModalProps) {
  const [view, setView] = useState<ModalView>("upload");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>(emptyFormData);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const { toast } = useToast();
  const { addBuyer } = useBuyers();
  const { authenticate, isAuthenticating } = useDocuSignAuth();

  const handleClose = () => {
    setView("upload");
    setFormData(emptyFormData);
    setUploadedFileName("");
    onOpenChange(false);
  };

  const updateFormField = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleManualSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      
      // Calculate commission fields (anticipated)
      const preApprovedAmount = parseFloat(formData.get("preApprovedAmount") as string) || 0;
      const commissionPercentage = parseFloat(formData.get("commissionPercentage") as string) || 0;
      const totalCommission = (preApprovedAmount * commissionPercentage) / 100;
      const agentCommission = totalCommission * 0.5; // Assuming 50/50 split
      const brokerageCommission = totalCommission * 0.5;

      // Create buyer data object
      const buyerData = {
        firstName: formData.get("buyerFirstName") as string,
        lastName: formData.get("buyerLastName") as string,
        email: formData.get("buyerEmail") as string,
        phone: formData.get("buyerPhone") as string || '',
        description: '', // Will be derived from wantsNeeds
        status: 'Active',
        image: '', // Default image handled by context
        preApprovedAmount,
        wantsNeeds: formData.get("wantsNeeds") as string,
        brokerageName: formData.get("brokerageName") as string || '',
        brokerageAddress: formData.get("brokerageAddress") as string || '',
        agentName: formData.get("agentName") as string || '',
        agentEmail: formData.get("agentEmail") as string || '',
        commissionPercentage,
        totalCommission,
        agentCommission,
        brokerageCommission,
      };

      // Call the addBuyer function from context - this handles:
      // 1. Saving to database
      // 2. Activating account (switching from demo to live)
      // 3. Refetching buyers
      await addBuyer(buyerData);

      handleClose();
    } catch (error) {
      console.error('Error adding buyer:', error);
      // Toast is already shown by context
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = (file: File) => {
    console.log("Uploading file for AI parsing:", file.name);
    setUploadedFileName(file.name);
    setView("processing");

    // TODO: Integrate with backend AI parsing service
    // For now, simulate AI parsing with mock data extraction
    setTimeout(() => {
      // Mock extracted data - in production this would come from AI parsing
      const mockExtractedData: FormData = {
        buyerFirstName: "John",
        buyerLastName: "Smith",
        buyerEmail: "john.smith@email.com",
        buyerPhone: "(555) 123-4567",
        preApprovedAmount: "450000",
        wantsNeeds: "3-bedroom house with yard, near good schools, updated kitchen preferred",
        brokerageName: "Premier Realty",
        brokerageAddress: "123 Main St",
        agentEmail: "",
        commissionPercentage: "3.0",
      };

      setFormData(mockExtractedData);
      setView("manual");
      
      toast({
        title: "Document Parsed Successfully",
        description: "Please review and confirm the extracted details below.",
      });
    }, 2500);
  };

  const handleDocuSignUpload = async () => {
    const result = await authenticate();
    if (result) {
      // TODO: Fetch documents from DocuSign using the access token
      console.log('DocuSign authenticated:', result);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Buyer</DialogTitle>
        </DialogHeader>

        {view === "upload" && (
          <div className="space-y-6 py-6">
            {/* Direct Upload */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Direct Upload</h3>
              <FileDropZone
                id="file-upload-buyer"
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
                  onClick={() => toast({ title: "Follow Up Boss", description: "Integration coming soon..." })}
                >
                  <img src={followUpBossLogo} alt="Follow Up Boss" className="h-10 object-contain" />
                </Button>
                <Button
                  variant="outline"
                  className="h-20 bg-secondary border-border hover:bg-primary/10 hover:border-primary/40 transition-all"
                  onClick={() => toast({ title: "Dotloop", description: "Integration coming soon..." })}
                >
                  <img src={dotloopLogo} alt="Dotloop" className="h-10 object-contain" />
                </Button>
              </div>
            </div>

            {/* Manual Entry Option */}
            <div className="text-center pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setView("manual")}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
              >
                Or enter details manually
              </button>
            </div>
          </div>
        )}

        {view === "processing" && (
          <div className="py-16 text-center">
            <Loader2 className="h-16 w-16 mx-auto mb-6 text-accent-gold animate-spin" />
            <h3 className="text-xl font-semibold mb-2">Processing Document</h3>
            <p className="text-muted-foreground mb-2">
              AI is extracting buyer information from your document...
            </p>
            <p className="text-sm text-muted-foreground">{uploadedFileName}</p>
            <div className="w-64 h-2 bg-secondary rounded-full mx-auto mt-4 overflow-hidden">
              <div className="h-full bg-accent-gold rounded-full animate-[pulse_1.5s_ease-in-out_infinite]" style={{ width: "60%" }}></div>
            </div>
          </div>
        )}

        {view === "manual" && (
          <form onSubmit={handleManualSubmit} className="space-y-6 py-4">
            {/* Show banner if form was prefilled from document */}
            {uploadedFileName && (
              <div className="bg-success/10 border border-success/20 rounded-lg p-4">
                <p className="text-sm font-medium text-success mb-1">✓ Document parsed: {uploadedFileName}</p>
                <p className="text-xs text-muted-foreground">Please review and confirm the extracted details below.</p>
              </div>
            )}

            {/* Buyer Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-text-heading">Buyer Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="buyerFirstName">First Name *</Label>
                  <Input 
                    id="buyerFirstName" 
                    name="buyerFirstName" 
                    value={formData.buyerFirstName}
                    onChange={(e) => updateFormField("buyerFirstName", e.target.value)}
                    required 
                  />
                </div>
                <div>
                  <Label htmlFor="buyerLastName">Last Name *</Label>
                  <Input 
                    id="buyerLastName" 
                    name="buyerLastName" 
                    value={formData.buyerLastName}
                    onChange={(e) => updateFormField("buyerLastName", e.target.value)}
                    required 
                  />
                </div>
                <div>
                  <Label htmlFor="buyerEmail">Email Address *</Label>
                  <Input 
                    id="buyerEmail" 
                    name="buyerEmail" 
                    type="email" 
                    value={formData.buyerEmail}
                    onChange={(e) => updateFormField("buyerEmail", e.target.value)}
                    required 
                  />
                </div>
                <div>
                  <Label htmlFor="buyerPhone">Cell Phone</Label>
                  <Input 
                    id="buyerPhone" 
                    name="buyerPhone" 
                    type="tel" 
                    value={formData.buyerPhone}
                    onChange={(e) => updateFormField("buyerPhone", e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="preApprovedAmount">Pre-approved Loan Amount</Label>
                  <Input 
                    id="preApprovedAmount" 
                    name="preApprovedAmount" 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    placeholder="Optional" 
                    value={formData.preApprovedAmount}
                    onChange={(e) => updateFormField("preApprovedAmount", e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="wantsNeeds">Primary Wants/Needs *</Label>
                  <Textarea
                    id="wantsNeeds"
                    name="wantsNeeds"
                    rows={4}
                    placeholder="Describe the buyer's requirements..."
                    value={formData.wantsNeeds}
                    onChange={(e) => updateFormField("wantsNeeds", e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Brokerage Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-text-heading">Brokerage Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="brokerageName">Brokerage Name</Label>
                  <Input 
                    id="brokerageName" 
                    name="brokerageName" 
                    value={formData.brokerageName}
                    onChange={(e) => updateFormField("brokerageName", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="brokerageAddress">Brokerage Address</Label>
                  <Input 
                    id="brokerageAddress" 
                    name="brokerageAddress" 
                    value={formData.brokerageAddress}
                    onChange={(e) => updateFormField("brokerageAddress", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="agentName">Assign To</Label>
                  <ContactSelect placeholder="Select contact..." className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="agentEmail">Agent Email</Label>
                  <Input 
                    id="agentEmail" 
                    name="agentEmail" 
                    type="email" 
                    placeholder="Default: User's Email" 
                    value={formData.agentEmail}
                    onChange={(e) => updateFormField("agentEmail", e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="commissionPercentage">Commission Percentage (%)</Label>
                  <Input 
                    id="commissionPercentage" 
                    name="commissionPercentage" 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    max="100" 
                    placeholder="e.g., 3.0" 
                    value={formData.commissionPercentage}
                    onChange={(e) => updateFormField("commissionPercentage", e.target.value)}
                  />
                </div>
              </div>
              <div className="text-sm text-muted-foreground p-4 bg-card-elevated rounded-lg">
                <p className="mb-1">💡 Anticipated commission (calculated on submit):</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Total Commission Earned = Pre-approved Amount × Commission %</li>
                  <li>Agent Commission = Total Commission × 50%</li>
                  <li>Brokerage Commission = Total Commission × 50%</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => { setView("upload"); setUploadedFileName(""); }} className="flex-1" disabled={isSubmitting}>
                Back
              </Button>
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? "Adding..." : "Add Buyer"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
