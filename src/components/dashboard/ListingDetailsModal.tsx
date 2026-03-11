import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AttachedEmailsTab from "./AttachedEmailsTab";
import ProfileContactsTab from "./ProfileContactsTab";
import { Edit2, Save, X, CheckCircle2, ChevronDown, ChevronRight, Folder, Camera, Plus, Trash2 } from "lucide-react";
import { useState, useRef } from "react";
import { useTasks } from "@/contexts/TasksContext";
import TaskDetailsModal from "./TaskDetailsModal";
import AddTaskModal from "./AddTaskModal";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { ListingData, useListings } from "@/contexts/ListingsContext";
import TransactionGuidanceBanner from "@/components/transactions/TransactionGuidanceBanner";
import TransactionPromptModal from "@/components/transactions/TransactionPromptModal";
import TransactionSuggestedTasks from "@/components/transactions/TransactionSuggestedTasks";

const LISTING_STATUSES = [
  { value: "Active", label: "Active", color: "bg-success" },
  { value: "Pending", label: "Pending", color: "bg-warning" },
  { value: "Closed", label: "Closed", color: "bg-secondary" },
  { value: "Off-Market", label: "Off-Market", color: "bg-muted-foreground" },
] as const;

interface ListingDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: ListingData | null;
  onListingUpdate?: (updatedListing: ListingData) => void;
}

export default function ListingDetailsModal({ open, onOpenChange, listing, onListingUpdate }: ListingDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedListing, setEditedListing] = useState<ListingData | null>(null);
  const [isPendingOpen, setIsPendingOpen] = useState(true);
  const [isCompletedOpen, setIsCompletedOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState<string>("");
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [isTxnPromptOpen, setIsTxnPromptOpen] = useState(false);
  const [suggestedTasksRefreshKey, setSuggestedTasksRefreshKey] = useState(0);
  const [txnCurrentState, setTxnCurrentState] = useState<string | null>(null);
  const [txnId, setTxnId] = useState<string | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { tasks, openTaskModal } = useTasks();
  const { deleteListing } = useListings();
  const { toast } = useToast();

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === "Closed") {
      setPendingStatus(newStatus);
      return;
    }
    applyStatusChange(newStatus);
  };

  const applyStatusChange = (newStatus: string) => {
    if (onListingUpdate && listing) {
      const updated = { ...(editedListing || listing), status: newStatus };
      onListingUpdate(updated);
      if (isEditing && editedListing) {
        setEditedListing(updated);
      }
    }
    setPendingStatus(null);
  };

  if (!listing) return null;

  const currentListing = isEditing && editedListing ? editedListing : listing;
  const displayImage = currentImage || currentListing.image;

  const handleEditToggle = () => {
    if (!isEditing) {
      setEditedListing({ ...listing });
    }
    setIsEditing(!isEditing);
  };

  const handleSave = () => {
    if (editedListing && onListingUpdate) {
      onListingUpdate(editedListing);
    }
    setIsEditing(false);
    toast({
      title: "Changes saved",
      description: "Listing information has been updated successfully",
    });
  };

  const handleCancel = () => {
    setEditedListing(null);
    setIsEditing(false);
  };

  const recalculateCommissions = (listing: ListingData): ListingData => {
    const price = Number(listing.price) || 0;
    const pct = Number(listing.commissionPercentage) || 0;
    const totalCommission = price * (pct / 100);
    const agentCommission = totalCommission * 0.5;
    const brokerageCommission = totalCommission * 0.5;
    return { ...listing, totalCommission, agentCommission, brokerageCommission, commission: agentCommission };
  };

  const updateField = (field: keyof ListingData, value: any) => {
    if (editedListing) {
      const updated = { ...editedListing, [field]: value };
      // Recalculate commissions when price or percentage changes
      if (field === 'price' || field === 'commissionPercentage') {
        setEditedListing(recalculateCommissions(updated));
      } else {
        setEditedListing(updated);
      }
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB",
          variant: "destructive",
        });
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file", 
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setCurrentImage(result);
        
        // Enter editing mode if not already editing
        if (!isEditing) {
          setIsEditing(true);
          setEditedListing({ ...listing, image: result });
        } else {
          setEditedListing({ ...editedListing!, image: result });
        }
        
        toast({
          title: "Photo updated",
          description: "Click 'Save' to confirm changes",
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  // handleAddTask removed - now using standardized AddTaskModal

  const associatedTasks = tasks.filter((task) => task.listingId === listing.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-8">
          <div className="flex items-center justify-between">
            <DialogTitle>Listing Details</DialogTitle>
            <div className="flex gap-2">
              {!isEditing ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEditToggle}
                    className="flex-shrink-0"
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  {!listing.isDemo && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsDeleteConfirmOpen(true)}
                      className="flex-shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button variant="default" size="sm" onClick={handleSave}>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleCancel}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="communication">Communication</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
        <div className="space-y-6 py-4">
          {/* Property Image and Status */}
          <div className="space-y-4">
            <div className="relative aspect-[16/9] overflow-hidden rounded-lg">
              <img
                src={displayImage}
                alt={currentListing.address}
                className="w-full h-full object-cover"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleCameraClick}
                className="absolute bottom-3 right-3 bg-background/90 border-card-border hover:bg-card-elevated/90 backdrop-blur-sm"
              >
                <Camera className="h-4 w-4 mr-2" />
                Change Photo
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
            
            {/* Always-accessible Status Control */}
            <div>
              <Label className="text-sm font-medium text-text-muted mb-2 block">Listing Status</Label>
              <div className="flex gap-2 flex-wrap">
                {LISTING_STATUSES.map((s) => {
                  const isActive = currentListing.status === s.value;
                  return (
                    <button
                      key={s.value}
                      onClick={() => handleStatusChange(s.value)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                        isActive
                          ? `${s.color} text-white border-transparent shadow-sm`
                          : 'bg-card-elevated text-text-muted border-card-border hover:border-accent-gold/30'
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Transaction stage progression control */}
            <TransactionGuidanceBanner
              recordType="listing"
              recordId={listing.id}
              refreshKey={suggestedTasksRefreshKey}
              onStartTransaction={(currentState, transactionId) => {
                setTxnCurrentState(currentState);
                setTxnId(transactionId);
                setIsTxnPromptOpen(true);
              }}
            />

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

          {/* Suggested Tasks from Transaction */}
          <TransactionSuggestedTasks recordType="listing" recordId={listing.id} refreshKey={suggestedTasksRefreshKey} />

          {/* Associated Tasks */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-text-heading">Associated Tasks</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddTaskOpen(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Task
              </Button>
            </div>
            {associatedTasks.length === 0 ? (
              <div className="text-center py-8 text-text-muted">
                <p className="text-sm">No tasks associated with this listing</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Pending Tasks Folder */}
                {associatedTasks.filter(t => t.status === "pending" || t.status === "in-progress").length > 0 && (
                  <Collapsible open={isPendingOpen} onOpenChange={setIsPendingOpen}>
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center gap-2 p-3 bg-warning/10 rounded-lg border border-warning/30 hover:bg-warning/15 transition-all cursor-pointer">
                        <Folder className="h-5 w-5 text-warning" />
                        {isPendingOpen ? (
                          <ChevronDown className="h-4 w-4 text-warning" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-warning" />
                        )}
                        <span className="font-semibold text-warning uppercase tracking-wide text-sm">
                          Pending Tasks ({associatedTasks.filter(t => t.status === "pending" || t.status === "in-progress").length})
                        </span>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 space-y-2 pl-4">
                      {associatedTasks.filter(task => task.status === "pending" || task.status === "in-progress").map((task) => (
                        <div
                          key={task.id}
                          onClick={() => openTaskModal(task)}
                          className="flex items-center justify-between p-3 bg-warning/5 rounded-md border border-warning/20 hover:border-warning/40 hover:bg-warning/10 transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <CheckCircle2
                              className={`h-5 w-5 ${
                                task.status === "in-progress" ? "text-warning" : "text-muted-foreground"
                              }`}
                            />
                            <div>
                              <p className="font-medium">{task.title}</p>
                              <p className="text-sm text-muted-foreground">Due: {task.dueDate}</p>
                            </div>
                          </div>
                          <Badge variant={task.status === "in-progress" ? "secondary" : "outline"}>
                            {task.status}
                          </Badge>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Completed Tasks Folder */}
                {associatedTasks.filter(t => t.status === "completed").length > 0 && (
                  <Collapsible open={isCompletedOpen} onOpenChange={setIsCompletedOpen}>
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center gap-2 p-3 bg-success/10 rounded-lg border border-success/30 hover:bg-success/15 transition-all cursor-pointer">
                        <Folder className="h-5 w-5 text-success" />
                        {isCompletedOpen ? (
                          <ChevronDown className="h-4 w-4 text-success" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-success" />
                        )}
                        <span className="font-semibold text-success uppercase tracking-wide text-sm">
                          Completed Tasks ({associatedTasks.filter(t => t.status === "completed").length})
                        </span>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 space-y-2 pl-4">
                      {associatedTasks.filter(task => task.status === "completed").map((task) => (
                        <div
                          key={task.id}
                          onClick={() => openTaskModal(task)}
                          className="flex items-center justify-between p-3 bg-success/5 rounded-md border border-success/20 hover:border-success/40 hover:bg-success/10 transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <CheckCircle2 className="h-5 w-5 text-success" />
                            <div>
                              <p className="font-medium">{task.title}</p>
                              <p className="text-sm text-muted-foreground">Due: {task.dueDate}</p>
                            </div>
                          </div>
                          <Badge variant="default">{task.status}</Badge>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            )}
          </div>
        </div>
          </TabsContent>

          <TabsContent value="communication">
            <div className="py-4">
              <AttachedEmailsTab recordType="listing" recordId={listing.id} />
            </div>
          </TabsContent>
        </Tabs>

        {/* Add Task Modal - Using standardized form */}
        <AddTaskModal 
          open={isAddTaskOpen} 
          onOpenChange={setIsAddTaskOpen}
          listingId={listing.id}
          defaultAddress={listing.address}
        />
      </DialogContent>
      <TaskDetailsModal />

      {/* Transaction prompt from guidance banner */}
      <TransactionPromptModal
        open={isTxnPromptOpen}
        onOpenChange={(open) => { setIsTxnPromptOpen(open); if (!open) setSuggestedTasksRefreshKey(k => k + 1); }}
        recordType="listing"
        recordId={listing.id}
        recordLabel={listing.address}
        importSource="manual"
        existingState={txnCurrentState}
        existingTransactionId={txnId}
      />

      {/* Confirmation dialog for closing a listing */}
      <AlertDialog open={!!pendingStatus} onOpenChange={(open) => !open && setPendingStatus(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark listing as Closed?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the listing as sold/closed. You can change the status again later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => pendingStatus && applyStatusChange(pendingStatus)}>
              Yes, mark as Closed
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this listing?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{listing.address}</strong> and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await deleteListing(listing.id);
                setIsDeleteConfirmOpen(false);
                onOpenChange(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
