import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ContactSelect } from "@/components/ui/contact-select";
import { Upload, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import docusignLogo from "@/assets/docusign-logo.png";
import { useDocuSignAuth } from "@/hooks/useDocuSignAuth";

interface AddListingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ModalView = "upload" | "manual";

export default function AddListingModal({ open, onOpenChange }: AddListingModalProps) {
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
    
    // Calculate commission fields
    const listingPrice = parseFloat(formData.get("listingPrice") as string) || 0;
    const commissionPercentage = parseFloat(formData.get("commissionPercentage") as string) || 0;
    const totalCommission = (listingPrice * commissionPercentage) / 100;
    const agentCommission = totalCommission * 0.5; // Assuming 50/50 split
    const brokerageCommission = totalCommission * 0.5;

    console.log("New Listing Data:", {
      ...Object.fromEntries(formData),
      totalCommission,
      agentCommission,
      brokerageCommission,
    });

    toast({
      title: "Listing Added",
      description: "New listing has been created successfully.",
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
          description: "Listing details extracted successfully.",
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
          <DialogTitle>Add New Listing</DialogTitle>
        </DialogHeader>

        {view === "upload" && (
          <div className="space-y-6 py-6">
            {/* Direct Upload */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Direct Upload</h3>
              <label htmlFor="file-upload-listing" className="cursor-pointer">
                <div className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-accent-gold/50 transition-colors">
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-semibold mb-2">Drop your document here</p>
                  <p className="text-sm text-muted-foreground">or click to browse</p>
                  <p className="text-xs text-muted-foreground mt-2">Supports PDF, DOC, DOCX files</p>
                </div>
                <input
                  id="file-upload-listing"
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileUpload}
                />
              </label>
            </div>

            {/* DocuSign Integration */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Load from DocuSign</h3>
            <Button
              variant="outline"
              className="w-full h-20 text-base hover:bg-accent-gold/5 hover:border-accent-gold/30 transition-all"
              onClick={handleDocuSignUpload}
              disabled={isAuthenticating}
            >
              <img src={docusignLogo} alt="DocuSign" className="h-12 object-contain" />
            </Button>
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
            {/* Seller Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-text-heading">Seller Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sellerFirstName">First Name *</Label>
                  <Input id="sellerFirstName" name="sellerFirstName" required />
                </div>
                <div>
                  <Label htmlFor="sellerLastName">Last Name *</Label>
                  <Input id="sellerLastName" name="sellerLastName" required />
                </div>
                <div>
                  <Label htmlFor="sellerEmail">Email Address *</Label>
                  <Input id="sellerEmail" name="sellerEmail" type="email" required />
                </div>
                <div>
                  <Label htmlFor="sellerPhone">Cell Phone *</Label>
                  <Input id="sellerPhone" name="sellerPhone" type="tel" required />
                </div>
              </div>
            </div>

            {/* Property Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-text-heading">Property Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="address">Address *</Label>
                  <Input id="address" name="address" required />
                </div>
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input id="city" name="city" required />
                </div>
                <div>
                  <Label htmlFor="zipcode">Zipcode *</Label>
                  <Input id="zipcode" name="zipcode" required />
                </div>
                <div>
                  <Label htmlFor="county">County *</Label>
                  <Input id="county" name="county" required />
                </div>
                <div>
                  <Label htmlFor="bedrooms">Bedrooms *</Label>
                  <Input id="bedrooms" name="bedrooms" type="number" min="0" required />
                </div>
                <div>
                  <Label htmlFor="bathrooms">Bathrooms *</Label>
                  <Input id="bathrooms" name="bathrooms" type="number" step="0.5" min="0" required />
                </div>
                <div>
                  <Label htmlFor="sqFeet">SQ Feet *</Label>
                  <Input id="sqFeet" name="sqFeet" type="number" min="0" required />
                </div>
                <div>
                  <Label htmlFor="listingPrice">Listing Price *</Label>
                  <Input id="listingPrice" name="listingPrice" type="number" step="0.01" min="0" required />
                </div>
                <div>
                  <Label htmlFor="appraisalPrice">Appraisal Price</Label>
                  <Input id="appraisalPrice" name="appraisalPrice" type="number" step="0.01" min="0" />
                </div>
                <div>
                  <Label htmlFor="multiUnit">Multi-unit *</Label>
                  <select
                    id="multiUnit"
                    name="multiUnit"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    required
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="listingStartDate">Listing Start Date *</Label>
                  <Input id="listingStartDate" name="listingStartDate" type="date" required />
                </div>
                <div>
                  <Label htmlFor="listingEndDate">Listing End Date *</Label>
                  <Input id="listingEndDate" name="listingEndDate" type="date" required />
                </div>
              </div>
            </div>

            {/* Commission/Brokerage Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-text-heading">Commission/Brokerage Details</h3>
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
                  <Input id="commissionPercentage" name="commissionPercentage" type="number" step="0.01" min="0" max="100" placeholder="e.g., 6.0" required />
                </div>
              </div>
              <div className="text-sm text-muted-foreground p-4 bg-card-elevated rounded-lg">
                <p className="mb-1">💡 Calculated fields (auto-computed on submit):</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Total Commission Earned = Listing Price × Commission %</li>
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
                Add Listing
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
