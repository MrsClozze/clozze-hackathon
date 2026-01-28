import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ContactSelect } from "@/components/ui/contact-select";
import { Upload, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import docusignLogo from "@/assets/docusign-logo-new.png";
import followUpBossLogo from "@/assets/follow-up-boss-logo.png";
import dotloopLogo from "@/assets/dotloop-logo.png";
import { useDocuSignAuth } from "@/hooks/useDocuSignAuth";

interface AddBuyerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ModalView = "upload" | "manual";

export default function AddBuyerModal({ open, onOpenChange }: AddBuyerModalProps) {
  const [view, setView] = useState<ModalView>("upload");
  const { toast } = useToast();
  const { authenticate, isAuthenticating } = useDocuSignAuth();

  const handleClose = () => {
    setView("upload");
    onOpenChange(false);
  };

  const handleManualSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Calculate commission fields (anticipated)
    const preApprovedAmount = parseFloat(formData.get("preApprovedAmount") as string) || 0;
    const commissionPercentage = parseFloat(formData.get("commissionPercentage") as string) || 0;
    const totalCommission = (preApprovedAmount * commissionPercentage) / 100;
    const agentCommission = totalCommission * 0.5; // Assuming 50/50 split
    const brokerageCommission = totalCommission * 0.5;

    console.log("New Buyer Data:", {
      ...Object.fromEntries(formData),
      totalCommission,
      agentCommission,
      brokerageCommission,
    });

    toast({
      title: "Buyer Added",
      description: "New buyer has been created successfully.",
    });

    handleClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log("Uploading file for AI parsing:", file.name);
      
      toast({
        title: "Document Uploaded",
        description: "AI is parsing the document...",
      });

      // TODO: Integrate with backend AI parsing service
      setTimeout(() => {
        toast({
          title: "Parsing Complete",
          description: "Buyer details extracted successfully.",
        });
        handleClose();
      }, 2000);
    }
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
              <label htmlFor="file-upload-buyer" className="cursor-pointer">
                <div className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-accent-gold/50 transition-colors">
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-semibold mb-2">Drop your document here</p>
                  <p className="text-sm text-muted-foreground">or click to browse</p>
                  <p className="text-xs text-muted-foreground mt-2">Supports PDF, DOC, DOCX files</p>
                </div>
                <input
                  id="file-upload-buyer"
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileUpload}
                />
              </label>
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

        {view === "manual" && (
          <form onSubmit={handleManualSubmit} className="space-y-6 py-4">
            {/* Buyer Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-text-heading">Buyer Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="buyerFirstName">First Name *</Label>
                  <Input id="buyerFirstName" name="buyerFirstName" required />
                </div>
                <div>
                  <Label htmlFor="buyerLastName">Last Name *</Label>
                  <Input id="buyerLastName" name="buyerLastName" required />
                </div>
                <div>
                  <Label htmlFor="buyerEmail">Email Address *</Label>
                  <Input id="buyerEmail" name="buyerEmail" type="email" required />
                </div>
                <div>
                  <Label htmlFor="buyerPhone">Cell Phone *</Label>
                  <Input id="buyerPhone" name="buyerPhone" type="tel" required />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="preApprovedAmount">Pre-approved Loan Amount</Label>
                  <Input id="preApprovedAmount" name="preApprovedAmount" type="number" step="0.01" min="0" placeholder="Optional" />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="wantsNeeds">Primary Wants/Needs *</Label>
                  <Textarea
                    id="wantsNeeds"
                    name="wantsNeeds"
                    rows={4}
                    placeholder="Describe the buyer's requirements..."
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
                  <Label htmlFor="brokerageName">Brokerage Name *</Label>
                  <Input id="brokerageName" name="brokerageName" required />
                </div>
                <div>
                  <Label htmlFor="brokerageAddress">Brokerage Address *</Label>
                  <Input id="brokerageAddress" name="brokerageAddress" required />
                </div>
                <div>
                  <Label htmlFor="agentName">Assign To *</Label>
                  <ContactSelect placeholder="Select contact..." className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="agentEmail">Agent Email *</Label>
                  <Input id="agentEmail" name="agentEmail" type="email" placeholder="Default: User's Email" required />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="commissionPercentage">Commission Percentage (%) *</Label>
                  <Input id="commissionPercentage" name="commissionPercentage" type="number" step="0.01" min="0" max="100" placeholder="e.g., 3.0" required />
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
              <Button type="button" variant="outline" onClick={() => setView("upload")} className="flex-1">
                Back
              </Button>
              <Button type="submit" className="flex-1">
                Add Buyer
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
