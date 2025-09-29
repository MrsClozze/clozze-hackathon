import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface ListingData {
  id: number;
  address: string;
  city: string;
  price: number;
  status: string;
  daysOnMarket: number;
  commission: number;
  image: string;
  sellerFirstName: string;
  sellerLastName: string;
  sellerEmail: string;
  sellerPhone: string;
  zipcode: string;
  county: string;
  bedrooms: number;
  bathrooms: number;
  sqFeet: number;
  appraisalPrice: number;
  multiUnit: string;
  listingStartDate: string;
  listingEndDate: string;
  brokerageName: string;
  brokerageAddress: string;
  agentName: string;
  agentEmail: string;
  commissionPercentage: number;
  totalCommission: number;
  agentCommission: number;
  brokerageCommission: number;
}

interface ListingDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: ListingData | null;
}

export default function ListingDetailsModal({ open, onOpenChange, listing }: ListingDetailsModalProps) {
  if (!listing) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Listing Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Property Image and Status */}
          <div className="space-y-4">
            <div className="relative aspect-[16/9] overflow-hidden rounded-lg">
              <img
                src={listing.image}
                alt={listing.address}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 right-3">
                <Badge className={
                  listing.status === 'Active' 
                    ? 'bg-success text-white' 
                    : listing.status === 'Pending'
                    ? 'bg-warning text-white'
                    : 'bg-secondary text-white'
                }>
                  {listing.status.toUpperCase()}
                </Badge>
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-text-heading">{listing.address}</h3>
              <p className="text-lg text-text-muted">{listing.city}</p>
              <p className="text-3xl font-bold text-accent-gold mt-2">
                ${listing.price.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Seller Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-text-heading">Seller Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-text-muted">First Name</Label>
                <p className="text-base mt-1">{listing.sellerFirstName}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-text-muted">Last Name</Label>
                <p className="text-base mt-1">{listing.sellerLastName}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-text-muted">Email Address</Label>
                <p className="text-base mt-1">{listing.sellerEmail}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-text-muted">Cell Phone</Label>
                <p className="text-base mt-1">{listing.sellerPhone}</p>
              </div>
            </div>
          </div>

          {/* Property Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-text-heading">Property Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label className="text-sm font-medium text-text-muted">Address</Label>
                <p className="text-base mt-1">{listing.address}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-text-muted">City</Label>
                <p className="text-base mt-1">{listing.city}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-text-muted">Zipcode</Label>
                <p className="text-base mt-1">{listing.zipcode}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-text-muted">County</Label>
                <p className="text-base mt-1">{listing.county}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-text-muted">Bedrooms</Label>
                <p className="text-base mt-1">{listing.bedrooms}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-text-muted">Bathrooms</Label>
                <p className="text-base mt-1">{listing.bathrooms}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-text-muted">Square Feet</Label>
                <p className="text-base mt-1">{listing.sqFeet.toLocaleString()} sq ft</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-text-muted">Listing Price</Label>
                <p className="text-base mt-1 font-semibold">${listing.price.toLocaleString()}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-text-muted">Appraisal Price</Label>
                <p className="text-base mt-1">${listing.appraisalPrice.toLocaleString()}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-text-muted">Multi-unit</Label>
                <p className="text-base mt-1 capitalize">{listing.multiUnit}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-text-muted">Listing Start Date</Label>
                <p className="text-base mt-1">{listing.listingStartDate}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-text-muted">Listing End Date</Label>
                <p className="text-base mt-1">{listing.listingEndDate}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-text-muted">Days on Market</Label>
                <p className="text-base mt-1">{listing.daysOnMarket} days</p>
              </div>
            </div>
          </div>

          {/* Commission/Brokerage Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-text-heading">Commission/Brokerage Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-text-muted">Brokerage Name</Label>
                <p className="text-base mt-1">{listing.brokerageName}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-text-muted">Brokerage Address</Label>
                <p className="text-base mt-1">{listing.brokerageAddress}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-text-muted">Agent Name</Label>
                <p className="text-base mt-1">{listing.agentName}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-text-muted">Agent Email</Label>
                <p className="text-base mt-1">{listing.agentEmail}</p>
              </div>
              <div className="col-span-2">
                <Label className="text-sm font-medium text-text-muted">Commission Percentage</Label>
                <p className="text-base mt-1">{listing.commissionPercentage}%</p>
              </div>
            </div>
            <div className="text-sm p-4 bg-card-elevated rounded-lg border">
              <p className="font-semibold mb-2">💰 Commission Breakdown</p>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Commission Earned:</span>
                  <span className="font-semibold">${listing.totalCommission.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Agent Commission (50%):</span>
                  <span className="font-semibold">${listing.agentCommission.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Brokerage Commission (50%):</span>
                  <span className="font-semibold">${listing.brokerageCommission.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
