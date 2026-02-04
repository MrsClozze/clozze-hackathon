import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ContactSelect } from "@/components/ui/contact-select";
import { FileDropZone } from "@/components/ui/file-drop-zone";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useListings } from "@/contexts/ListingsContext";
import docusignLogo from "@/assets/docusign-logo-new.png";
import followUpBossLogo from "@/assets/follow-up-boss-logo.png";
import dotloopLogo from "@/assets/dotloop-logo.png";
import { useDocuSignAuth } from "@/hooks/useDocuSignAuth";
import { useDocumentParser } from "@/hooks/useDocumentParser";
import { useDotloopConnection } from "@/hooks/useDotloopConnection";

interface AddListingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ModalView = "upload" | "processing" | "manual";

interface FormData {
  sellerFirstName: string;
  sellerLastName: string;
  sellerEmail: string;
  sellerPhone: string;
  address: string;
  city: string;
  zipcode: string;
  county: string;
  bedrooms: string;
  bathrooms: string;
  sqFeet: string;
  listingPrice: string;
  appraisalPrice: string;
  multiUnit: string;
  listingStartDate: string;
  listingEndDate: string;
  brokerageName: string;
  brokerageAddress: string;
  agentEmail: string;
  commissionPercentage: string;
}

const emptyFormData: FormData = {
  sellerFirstName: "",
  sellerLastName: "",
  sellerEmail: "",
  sellerPhone: "",
  address: "",
  city: "",
  zipcode: "",
  county: "",
  bedrooms: "",
  bathrooms: "",
  sqFeet: "",
  listingPrice: "",
  appraisalPrice: "",
  multiUnit: "no",
  listingStartDate: "",
  listingEndDate: "",
  brokerageName: "",
  brokerageAddress: "",
  agentEmail: "",
  commissionPercentage: "",
};

export default function AddListingModal({ open, onOpenChange }: AddListingModalProps) {
  const [view, setView] = useState<ModalView>("upload");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>(emptyFormData);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const { toast } = useToast();
  const { addListing } = useListings();
  const { authenticate, isAuthenticating } = useDocuSignAuth();
  const { parseListingDocument, isParsing } = useDocumentParser();
  const { connect: connectDotloop, connecting: dotloopConnecting } = useDotloopConnection();
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
      
      // Calculate commission fields
      const listingPrice = parseFloat(formData.get("listingPrice") as string) || 0;
      const commissionPercentage = parseFloat(formData.get("commissionPercentage") as string) || 0;
      const totalCommission = (listingPrice * commissionPercentage) / 100;
      const agentCommission = totalCommission * 0.5; // Assuming 50/50 split
      const brokerageCommission = totalCommission * 0.5;

      // Create listing data object
      const listingData = {
        address: formData.get("address") as string,
        city: formData.get("city") as string,
        price: listingPrice,
        status: 'Active',
        daysOnMarket: 0,
        commission: agentCommission,
        image: '', // Default image handled by context
        sellerFirstName: formData.get("sellerFirstName") as string,
        sellerLastName: formData.get("sellerLastName") as string,
        sellerEmail: formData.get("sellerEmail") as string,
        sellerPhone: formData.get("sellerPhone") as string,
        zipcode: formData.get("zipcode") as string,
        county: formData.get("county") as string,
        bedrooms: parseInt(formData.get("bedrooms") as string) || 0,
        bathrooms: parseFloat(formData.get("bathrooms") as string) || 0,
        sqFeet: parseInt(formData.get("sqFeet") as string) || 0,
        appraisalPrice: parseFloat(formData.get("appraisalPrice") as string) || 0,
        multiUnit: formData.get("multiUnit") as string || 'no',
        listingStartDate: formData.get("listingStartDate") as string || '',
        listingEndDate: formData.get("listingEndDate") as string || '',
        brokerageName: formData.get("brokerageName") as string,
        brokerageAddress: formData.get("brokerageAddress") as string,
        agentName: formData.get("agentName") as string || '',
        agentEmail: formData.get("agentEmail") as string,
        commissionPercentage,
        totalCommission,
        agentCommission,
        brokerageCommission,
      };

      // Call the addListing function from context - this handles:
      // 1. Saving to database
      // 2. Activating account (switching from demo to live)
      // 3. Refetching listings
      await addListing(listingData);

      handleClose();
    } catch (error) {
      console.error('Error adding listing:', error);
      // Toast is already shown by context
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    console.log("Uploading file for AI parsing:", file.name);
    setUploadedFileName(file.name);
    setView("processing");

    const result = await parseListingDocument(file);
    
    if (result.success && result.data) {
      setFormData(result.data);
      setView("manual");
      
      toast({
        title: "Document Parsed Successfully",
        description: "Please review and confirm the extracted details below.",
      });
    } else {
      // On error, go back to upload view
      setView("upload");
      setUploadedFileName("");
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
              <FileDropZone
                id="file-upload-listing"
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
                  onClick={() => connectDotloop()}
                  disabled={dotloopConnecting}
                >
                  {dotloopConnecting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
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
              AI is extracting listing information from your document...
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

            {/* Seller Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-text-heading">Seller Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sellerFirstName">First Name *</Label>
                  <Input 
                    id="sellerFirstName" 
                    name="sellerFirstName" 
                    value={formData.sellerFirstName}
                    onChange={(e) => updateFormField("sellerFirstName", e.target.value)}
                    required 
                  />
                </div>
                <div>
                  <Label htmlFor="sellerLastName">Last Name *</Label>
                  <Input 
                    id="sellerLastName" 
                    name="sellerLastName" 
                    value={formData.sellerLastName}
                    onChange={(e) => updateFormField("sellerLastName", e.target.value)}
                    required 
                  />
                </div>
                <div>
                  <Label htmlFor="sellerEmail">Email Address *</Label>
                  <Input 
                    id="sellerEmail" 
                    name="sellerEmail" 
                    type="email" 
                    value={formData.sellerEmail}
                    onChange={(e) => updateFormField("sellerEmail", e.target.value)}
                    required 
                  />
                </div>
                <div>
                  <Label htmlFor="sellerPhone">Cell Phone</Label>
                  <Input 
                    id="sellerPhone" 
                    name="sellerPhone" 
                    type="tel" 
                    value={formData.sellerPhone}
                    onChange={(e) => updateFormField("sellerPhone", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Property Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-text-heading">Property Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="address">Address *</Label>
                  <Input 
                    id="address" 
                    name="address" 
                    value={formData.address}
                    onChange={(e) => updateFormField("address", e.target.value)}
                    required 
                  />
                </div>
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input 
                    id="city" 
                    name="city" 
                    value={formData.city}
                    onChange={(e) => updateFormField("city", e.target.value)}
                    required 
                  />
                </div>
                <div>
                  <Label htmlFor="zipcode">Zipcode</Label>
                  <Input 
                    id="zipcode" 
                    name="zipcode" 
                    value={formData.zipcode}
                    onChange={(e) => updateFormField("zipcode", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="county">County</Label>
                  <Input 
                    id="county" 
                    name="county" 
                    value={formData.county}
                    onChange={(e) => updateFormField("county", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="bedrooms">Bedrooms</Label>
                  <Input 
                    id="bedrooms" 
                    name="bedrooms" 
                    type="number" 
                    min="0" 
                    value={formData.bedrooms}
                    onChange={(e) => updateFormField("bedrooms", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="bathrooms">Bathrooms</Label>
                  <Input 
                    id="bathrooms" 
                    name="bathrooms" 
                    type="number" 
                    step="0.5" 
                    min="0" 
                    value={formData.bathrooms}
                    onChange={(e) => updateFormField("bathrooms", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="sqFeet">SQ Feet</Label>
                  <Input 
                    id="sqFeet" 
                    name="sqFeet" 
                    type="number" 
                    min="0" 
                    value={formData.sqFeet}
                    onChange={(e) => updateFormField("sqFeet", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="listingPrice">Listing Price *</Label>
                  <Input 
                    id="listingPrice" 
                    name="listingPrice" 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    value={formData.listingPrice}
                    onChange={(e) => updateFormField("listingPrice", e.target.value)}
                    required 
                  />
                </div>
                <div>
                  <Label htmlFor="appraisalPrice">Appraisal Price</Label>
                  <Input 
                    id="appraisalPrice" 
                    name="appraisalPrice" 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    value={formData.appraisalPrice}
                    onChange={(e) => updateFormField("appraisalPrice", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="multiUnit">Multi-unit</Label>
                  <select
                    id="multiUnit"
                    name="multiUnit"
                    value={formData.multiUnit}
                    onChange={(e) => updateFormField("multiUnit", e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="listingStartDate">Listing Start Date</Label>
                  <Input 
                    id="listingStartDate" 
                    name="listingStartDate" 
                    type="date" 
                    value={formData.listingStartDate}
                    onChange={(e) => updateFormField("listingStartDate", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="listingEndDate">Listing End Date</Label>
                  <Input 
                    id="listingEndDate" 
                    name="listingEndDate" 
                    type="date" 
                    value={formData.listingEndDate}
                    onChange={(e) => updateFormField("listingEndDate", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Commission/Brokerage Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-text-heading">Commission/Brokerage Details</h3>
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
                    placeholder="e.g., 6.0" 
                    value={formData.commissionPercentage}
                    onChange={(e) => updateFormField("commissionPercentage", e.target.value)}
                  />
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
              <Button type="button" variant="outline" onClick={() => setView("upload")} className="flex-1" disabled={isSubmitting}>
                Back
              </Button>
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? "Adding..." : "Add Listing"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
