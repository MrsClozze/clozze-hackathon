import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit2, Save, X, CheckCircle2 } from "lucide-react";
import { useState } from "react";

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
  const [isEditing, setIsEditing] = useState(false);
  const [editedListing, setEditedListing] = useState<ListingData | null>(null);

  if (!listing) return null;

  const currentListing = isEditing && editedListing ? editedListing : listing;

  const handleEditToggle = () => {
    if (!isEditing) {
      setEditedListing({ ...listing });
    }
    setIsEditing(!isEditing);
  };

  const handleSave = () => {
    // Save logic would go here
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedListing(null);
    setIsEditing(false);
  };

  const updateField = (field: keyof ListingData, value: any) => {
    if (editedListing) {
      setEditedListing({ ...editedListing, [field]: value });
    }
  };

  // Mock tasks associated with this listing
  const associatedTasks = [
    { id: 1, title: "Schedule professional photos", status: "completed", dueDate: "2024-03-01" },
    { id: 2, title: "List property on MLS", status: "completed", dueDate: "2024-03-05" },
    { id: 3, title: "Schedule open house", status: "in-progress", dueDate: "2024-03-18" },
    { id: 4, title: "Review purchase offers", status: "pending", dueDate: "2024-03-25" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-8">
          <div className="flex items-center justify-between">
            <DialogTitle>Listing Details</DialogTitle>
            {!isEditing ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEditToggle}
                className="flex-shrink-0"
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="default" size="sm" onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Property Image and Status */}
          <div className="space-y-4">
            <div className="relative aspect-[16/9] overflow-hidden rounded-lg">
              <img
                src={currentListing.image}
                alt={currentListing.address}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 right-3">
                <Badge className={
                  currentListing.status === 'Active' 
                    ? 'bg-success text-white' 
                    : currentListing.status === 'Pending'
                    ? 'bg-warning text-white'
                    : 'bg-secondary text-white'
                }>
                  {currentListing.status.toUpperCase()}
                </Badge>
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-text-heading">{currentListing.address}</h3>
              <p className="text-lg text-text-muted">{currentListing.city}</p>
              <p className="text-3xl font-bold text-accent-gold mt-2">
                ${currentListing.price.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Seller Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-text-heading">Seller Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-text-muted">First Name</Label>
                {isEditing ? (
                  <Input
                    value={currentListing.sellerFirstName}
                    onChange={(e) => updateField('sellerFirstName', e.target.value)}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-base mt-1">{currentListing.sellerFirstName}</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-medium text-text-muted">Last Name</Label>
                {isEditing ? (
                  <Input
                    value={currentListing.sellerLastName}
                    onChange={(e) => updateField('sellerLastName', e.target.value)}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-base mt-1">{currentListing.sellerLastName}</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-medium text-text-muted">Email Address</Label>
                {isEditing ? (
                  <Input
                    type="email"
                    value={currentListing.sellerEmail}
                    onChange={(e) => updateField('sellerEmail', e.target.value)}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-base mt-1">{currentListing.sellerEmail}</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-medium text-text-muted">Cell Phone</Label>
                {isEditing ? (
                  <Input
                    value={currentListing.sellerPhone}
                    onChange={(e) => updateField('sellerPhone', e.target.value)}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-base mt-1">{currentListing.sellerPhone}</p>
                )}
              </div>
            </div>
          </div>

          {/* Property Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-text-heading">Property Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label className="text-sm font-medium text-text-muted">Address</Label>
                {isEditing ? (
                  <Input
                    value={currentListing.address}
                    onChange={(e) => updateField('address', e.target.value)}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-base mt-1">{currentListing.address}</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-medium text-text-muted">City</Label>
                {isEditing ? (
                  <Input
                    value={currentListing.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-base mt-1">{currentListing.city}</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-medium text-text-muted">Zipcode</Label>
                {isEditing ? (
                  <Input
                    value={currentListing.zipcode}
                    onChange={(e) => updateField('zipcode', e.target.value)}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-base mt-1">{currentListing.zipcode}</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-medium text-text-muted">County</Label>
                {isEditing ? (
                  <Input
                    value={currentListing.county}
                    onChange={(e) => updateField('county', e.target.value)}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-base mt-1">{currentListing.county}</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-medium text-text-muted">Bedrooms</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={currentListing.bedrooms}
                    onChange={(e) => updateField('bedrooms', parseInt(e.target.value))}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-base mt-1">{currentListing.bedrooms}</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-medium text-text-muted">Bathrooms</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={currentListing.bathrooms}
                    onChange={(e) => updateField('bathrooms', parseInt(e.target.value))}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-base mt-1">{currentListing.bathrooms}</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-medium text-text-muted">Square Feet</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={currentListing.sqFeet}
                    onChange={(e) => updateField('sqFeet', parseInt(e.target.value))}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-base mt-1">{currentListing.sqFeet.toLocaleString()} sq ft</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-medium text-text-muted">Listing Price</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={currentListing.price}
                    onChange={(e) => updateField('price', parseInt(e.target.value))}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-base mt-1 font-semibold">${currentListing.price.toLocaleString()}</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-medium text-text-muted">Appraisal Price</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={currentListing.appraisalPrice}
                    onChange={(e) => updateField('appraisalPrice', parseInt(e.target.value))}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-base mt-1">${currentListing.appraisalPrice.toLocaleString()}</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-medium text-text-muted">Multi-unit</Label>
                {isEditing ? (
                  <Select
                    value={currentListing.multiUnit}
                    onValueChange={(value) => updateField('multiUnit', value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-base mt-1 capitalize">{currentListing.multiUnit}</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-medium text-text-muted">Listing Start Date</Label>
                {isEditing ? (
                  <Input
                    type="date"
                    value={currentListing.listingStartDate}
                    onChange={(e) => updateField('listingStartDate', e.target.value)}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-base mt-1">{currentListing.listingStartDate}</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-medium text-text-muted">Listing End Date</Label>
                {isEditing ? (
                  <Input
                    type="date"
                    value={currentListing.listingEndDate}
                    onChange={(e) => updateField('listingEndDate', e.target.value)}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-base mt-1">{currentListing.listingEndDate}</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-medium text-text-muted">Days on Market</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={currentListing.daysOnMarket}
                    onChange={(e) => updateField('daysOnMarket', parseInt(e.target.value))}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-base mt-1">{currentListing.daysOnMarket} days</p>
                )}
              </div>
            </div>
          </div>

          {/* Commission/Brokerage Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-text-heading">Commission/Brokerage Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-text-muted">Brokerage Name</Label>
                {isEditing ? (
                  <Input
                    value={currentListing.brokerageName}
                    onChange={(e) => updateField('brokerageName', e.target.value)}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-base mt-1">{currentListing.brokerageName}</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-medium text-text-muted">Brokerage Address</Label>
                {isEditing ? (
                  <Input
                    value={currentListing.brokerageAddress}
                    onChange={(e) => updateField('brokerageAddress', e.target.value)}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-base mt-1">{currentListing.brokerageAddress}</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-medium text-text-muted">Agent Name</Label>
                {isEditing ? (
                  <Input
                    value={currentListing.agentName}
                    onChange={(e) => updateField('agentName', e.target.value)}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-base mt-1">{currentListing.agentName}</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-medium text-text-muted">Agent Email</Label>
                {isEditing ? (
                  <Input
                    type="email"
                    value={currentListing.agentEmail}
                    onChange={(e) => updateField('agentEmail', e.target.value)}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-base mt-1">{currentListing.agentEmail}</p>
                )}
              </div>
              <div className="col-span-2">
                <Label className="text-sm font-medium text-text-muted">Commission Percentage</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={currentListing.commissionPercentage}
                    onChange={(e) => updateField('commissionPercentage', parseFloat(e.target.value))}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-base mt-1">{currentListing.commissionPercentage}%</p>
                )}
              </div>
            </div>
            <div className="text-sm p-4 bg-card-elevated rounded-lg border">
              <p className="font-semibold mb-2">Commission Breakdown</p>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Commission Earned:</span>
                  <span className="font-semibold">${currentListing.totalCommission.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Agent Commission (50%):</span>
                  <span className="font-semibold">${currentListing.agentCommission.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Brokerage Commission (50%):</span>
                  <span className="font-semibold">${currentListing.brokerageCommission.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Associated Tasks */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-text-heading">Associated Tasks</h3>
            <div className="space-y-2">
              {associatedTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-md border">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className={`h-5 w-5 ${
                      task.status === 'completed' ? 'text-success' : 
                      task.status === 'in-progress' ? 'text-warning' : 
                      'text-muted-foreground'
                    }`} />
                    <div>
                      <p className="font-medium">{task.title}</p>
                      <p className="text-sm text-muted-foreground">Due: {task.dueDate}</p>
                    </div>
                  </div>
                  <Badge variant={
                    task.status === 'completed' ? 'default' : 
                    task.status === 'in-progress' ? 'secondary' : 
                    'outline'
                  }>
                    {task.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
