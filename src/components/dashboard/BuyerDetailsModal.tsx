import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface BuyerData {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  description: string;
  status: string;
  image: string;
  preApprovedAmount: number;
  wantsNeeds: string;
  brokerageName: string;
  brokerageAddress: string;
  agentName: string;
  agentEmail: string;
  commissionPercentage: number;
  totalCommission: number;
  agentCommission: number;
  brokerageCommission: number;
}

interface BuyerDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buyer: BuyerData | null;
}

export default function BuyerDetailsModal({ open, onOpenChange, buyer }: BuyerDetailsModalProps) {
  if (!buyer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Buyer Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Buyer Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-4 pb-4 border-b">
              <img
                src={buyer.image}
                alt={buyer.name}
                className="w-16 h-16 rounded-full object-cover"
              />
              <div>
                <h3 className="text-xl font-semibold text-text-heading">{buyer.name}</h3>
                <Badge className="mt-1 bg-accent-gold text-accent-gold-foreground">
                  {buyer.status}
                </Badge>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-text-heading">Buyer Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-text-muted">First Name</Label>
                <p className="text-base mt-1">{buyer.firstName}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-text-muted">Last Name</Label>
                <p className="text-base mt-1">{buyer.lastName}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-text-muted">Email Address</Label>
                <p className="text-base mt-1">{buyer.email}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-text-muted">Cell Phone</Label>
                <p className="text-base mt-1">{buyer.phone}</p>
              </div>
              <div className="col-span-2">
                <Label className="text-sm font-medium text-text-muted">Pre-approved Loan Amount</Label>
                <p className="text-base mt-1 font-semibold">
                  ${buyer.preApprovedAmount.toLocaleString()}
                </p>
              </div>
              <div className="col-span-2">
                <Label className="text-sm font-medium text-text-muted">Primary Wants/Needs</Label>
                <p className="text-base mt-1 p-3 bg-muted/30 rounded-md border">
                  {buyer.wantsNeeds}
                </p>
              </div>
            </div>
          </div>

          {/* Brokerage Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-text-heading">Brokerage Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-text-muted">Brokerage Name</Label>
                <p className="text-base mt-1">{buyer.brokerageName}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-text-muted">Brokerage Address</Label>
                <p className="text-base mt-1">{buyer.brokerageAddress}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-text-muted">Agent Name</Label>
                <p className="text-base mt-1">{buyer.agentName}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-text-muted">Agent Email</Label>
                <p className="text-base mt-1">{buyer.agentEmail}</p>
              </div>
              <div className="col-span-2">
                <Label className="text-sm font-medium text-text-muted">Commission Percentage</Label>
                <p className="text-base mt-1">{buyer.commissionPercentage}%</p>
              </div>
            </div>
            <div className="text-sm p-4 bg-card-elevated rounded-lg border">
              <p className="font-semibold mb-2">💰 Anticipated Commission Breakdown</p>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Commission Earned:</span>
                  <span className="font-semibold">${buyer.totalCommission.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Agent Commission (50%):</span>
                  <span className="font-semibold">${buyer.agentCommission.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Brokerage Commission (50%):</span>
                  <span className="font-semibold">${buyer.brokerageCommission.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
