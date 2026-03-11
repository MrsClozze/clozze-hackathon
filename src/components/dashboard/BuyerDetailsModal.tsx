import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AttachedEmailsTab from "./AttachedEmailsTab";

const BUYER_STATUSES = [
  { value: "Active", label: "Active", color: "bg-success" },
  { value: "Pending", label: "Pending", color: "bg-warning" },
  { value: "Closed", label: "Closed", color: "bg-secondary" },
  { value: "Off-Market", label: "Off-Market", color: "bg-muted-foreground" },
] as const;
import { Edit2, Save, X, CheckCircle2, ChevronDown, ChevronRight, Folder, Camera, Plus, Trash2 } from "lucide-react";
import { useState, useRef } from "react";
import { useTasks } from "@/contexts/TasksContext";
import TaskDetailsModal from "./TaskDetailsModal";
import AddTaskModal from "./AddTaskModal";
import { useToast } from "@/hooks/use-toast";
import { BuyerData, useBuyers } from "@/contexts/BuyersContext";
import TransactionGuidanceBanner from "@/components/transactions/TransactionGuidanceBanner";
import TransactionPromptModal from "@/components/transactions/TransactionPromptModal";
import TransactionSuggestedTasks from "@/components/transactions/TransactionSuggestedTasks";


interface BuyerDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buyer: BuyerData | null;
  onBuyerUpdate?: (updatedBuyer: BuyerData) => void;
}

export default function BuyerDetailsModal({ open, onOpenChange, buyer, onBuyerUpdate }: BuyerDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedBuyer, setEditedBuyer] = useState<BuyerData | null>(null);
  const [isPendingOpen, setIsPendingOpen] = useState(true);
  const [isCompletedOpen, setIsCompletedOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState<string>("");
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [isTxnPromptOpen, setIsTxnPromptOpen] = useState(false);
  const [suggestedTasksRefreshKey, setSuggestedTasksRefreshKey] = useState(0);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { tasks, openTaskModal } = useTasks();
  const { deleteBuyer } = useBuyers();
  const { toast } = useToast();

  if (!buyer) return null;

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === "Closed") {
      setPendingStatus(newStatus);
      return;
    }
    applyStatusChange(newStatus);
  };

  const applyStatusChange = (newStatus: string) => {
    if (onBuyerUpdate && buyer) {
      const updated = { ...(editedBuyer || buyer), status: newStatus };
      onBuyerUpdate(updated);
      if (isEditing && editedBuyer) {
        setEditedBuyer(updated);
      }
    }
    setPendingStatus(null);
  };

  const currentBuyer = isEditing && editedBuyer ? editedBuyer : buyer;
  const displayImage = currentImage || currentBuyer.image;
  const associatedTasks = tasks.filter((task) => task.buyerId === buyer.id);

  const handleEditToggle = () => {
    if (!isEditing) {
      setEditedBuyer({ ...buyer });
    }
    setIsEditing(!isEditing);
  };

  const handleSave = () => {
    if (editedBuyer && onBuyerUpdate) {
      onBuyerUpdate(editedBuyer);
    }
    setIsEditing(false);
    toast({
      title: "Changes saved",
      description: "Buyer information has been updated successfully",
    });
  };

  const handleCancel = () => {
    setEditedBuyer(null);
    setIsEditing(false);
  };

  const updateField = (field: keyof BuyerData, value: any) => {
    if (editedBuyer) {
      let updatedBuyer = { ...editedBuyer, [field]: value };
      
      // Recalculate commissions when relevant fields change
      if (field === 'preApprovedAmount' || field === 'commissionPercentage') {
        const preApproved = field === 'preApprovedAmount' ? value : updatedBuyer.preApprovedAmount;
        const commPct = field === 'commissionPercentage' ? value : updatedBuyer.commissionPercentage;
        const totalCommission = (preApproved * commPct) / 100;
        const agentCommission = totalCommission * 0.5;
        const brokerageCommission = totalCommission * 0.5;
        
        updatedBuyer = {
          ...updatedBuyer,
          totalCommission,
          agentCommission,
          brokerageCommission,
        };
      }
      
      setEditedBuyer(updatedBuyer);
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
          setEditedBuyer({ ...buyer, image: result });
        } else {
          setEditedBuyer({ ...editedBuyer!, image: result });
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-8">
          <div className="flex items-center justify-between">
            <DialogTitle>Buyer Details</DialogTitle>
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
                  {!buyer.isDemo && (
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
          {/* Buyer Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-4 pb-4 border-b">
              <div className="relative">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                  <img
                    src={displayImage}
                    alt={currentBuyer.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCameraClick}
                  className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full p-0 bg-background border-card-border hover:bg-card-elevated"
                >
                  <Camera className="h-4 w-4" />
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-text-heading">{currentBuyer.name}</h3>
                <Badge className="mt-1 bg-accent-gold text-accent-gold-foreground">
                  {currentBuyer.status}
                </Badge>
              </div>
            </div>

            {/* Always-accessible Status Control */}
            <div>
              <Label className="text-sm font-medium text-text-muted mb-2 block">Buyer Status</Label>
              <div className="flex gap-2 flex-wrap">
                {BUYER_STATUSES.map((s) => {
                  const isActive = currentBuyer.status === s.value;
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

            {/* Medium-confidence guidance banner */}
            <TransactionGuidanceBanner
              recordType="buyer"
              recordId={buyer.id}
              onStartTransaction={() => setIsTxnPromptOpen(true)}
            />

            <h3 className="text-lg font-semibold text-text-heading">Buyer Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-text-muted">First Name</Label>
                {isEditing ? (
                  <Input
                    value={currentBuyer.firstName}
                    onChange={(e) => updateField('firstName', e.target.value)}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-base mt-1">{currentBuyer.firstName}</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-medium text-text-muted">Last Name</Label>
                {isEditing ? (
                  <Input
                    value={currentBuyer.lastName}
                    onChange={(e) => updateField('lastName', e.target.value)}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-base mt-1">{currentBuyer.lastName}</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-medium text-text-muted">Email Address</Label>
                {isEditing ? (
                  <Input
                    type="email"
                    value={currentBuyer.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-base mt-1">{currentBuyer.email}</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-medium text-text-muted">Cell Phone</Label>
                {isEditing ? (
                  <Input
                    value={currentBuyer.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-base mt-1">{currentBuyer.phone}</p>
                )}
              </div>
              <div className="col-span-2">
                <Label className="text-sm font-medium text-text-muted">Pre-approved Loan Amount</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={currentBuyer.preApprovedAmount}
                    onChange={(e) => updateField('preApprovedAmount', parseFloat(e.target.value))}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-base mt-1 font-semibold">
                    ${currentBuyer.preApprovedAmount.toLocaleString()}
                  </p>
                )}
              </div>
              <div className="col-span-2">
                <Label className="text-sm font-medium text-text-muted">Primary Wants/Needs</Label>
                {isEditing ? (
                  <Textarea
                    value={currentBuyer.wantsNeeds}
                    onChange={(e) => updateField('wantsNeeds', e.target.value)}
                    className="mt-1"
                    rows={3}
                  />
                ) : (
                  <p className="text-base mt-1 p-3 bg-muted/30 rounded-md border">
                    {currentBuyer.wantsNeeds}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Brokerage Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-text-heading">Brokerage Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-text-muted">Brokerage Name</Label>
                {isEditing ? (
                  <Input
                    value={currentBuyer.brokerageName}
                    onChange={(e) => updateField('brokerageName', e.target.value)}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-base mt-1">{currentBuyer.brokerageName}</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-medium text-text-muted">Brokerage Address</Label>
                {isEditing ? (
                  <Input
                    value={currentBuyer.brokerageAddress}
                    onChange={(e) => updateField('brokerageAddress', e.target.value)}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-base mt-1">{currentBuyer.brokerageAddress}</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-medium text-text-muted">Agent Name</Label>
                {isEditing ? (
                  <Input
                    value={currentBuyer.agentName}
                    onChange={(e) => updateField('agentName', e.target.value)}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-base mt-1">{currentBuyer.agentName}</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-medium text-text-muted">Agent Email</Label>
                {isEditing ? (
                  <Input
                    type="email"
                    value={currentBuyer.agentEmail}
                    onChange={(e) => updateField('agentEmail', e.target.value)}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-base mt-1">{currentBuyer.agentEmail}</p>
                )}
              </div>
              <div className="col-span-2">
                <Label className="text-sm font-medium text-text-muted">Commission Percentage</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={currentBuyer.commissionPercentage}
                    onChange={(e) => updateField('commissionPercentage', parseFloat(e.target.value))}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-base mt-1">{currentBuyer.commissionPercentage}%</p>
                )}
              </div>
            </div>
            <div className="text-sm p-4 bg-card-elevated rounded-lg border">
              <p className="font-semibold mb-2">Anticipated Commission Breakdown</p>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Commission Earned:</span>
                  <span className="font-semibold">${currentBuyer.totalCommission.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Agent Commission (50%):</span>
                  <span className="font-semibold">${currentBuyer.agentCommission.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Brokerage Commission (50%):</span>
                  <span className="font-semibold">${currentBuyer.brokerageCommission.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Suggested Tasks from Transaction */}
          <TransactionSuggestedTasks recordType="buyer" recordId={buyer.id} refreshKey={suggestedTasksRefreshKey} />

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
                <p className="text-sm">No tasks associated with this buyer</p>
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
              <AttachedEmailsTab recordType="buyer" recordId={buyer.id} />
            </div>
          </TabsContent>
        </Tabs>

        {/* Add Task Modal - Using standardized form */}
        <AddTaskModal 
          open={isAddTaskOpen} 
          onOpenChange={setIsAddTaskOpen}
          buyerId={buyer.id}
          defaultAddress={buyer.name}
        />
      </DialogContent>
      <TaskDetailsModal />

      {/* Transaction prompt from guidance banner */}
      <TransactionPromptModal
        open={isTxnPromptOpen}
        onOpenChange={setIsTxnPromptOpen}
        recordType="buyer"
        recordId={buyer.id}
        recordLabel={buyer.name}
        importSource="manual"
      />

      {/* Closed confirmation dialog */}
      <AlertDialog open={!!pendingStatus} onOpenChange={(open) => !open && setPendingStatus(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark buyer as Closed?</AlertDialogTitle>
            <AlertDialogDescription>
              This means the buyer has successfully purchased a home. You can change the status back at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => applyStatusChange(pendingStatus!)}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this buyer?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{buyer.name}</strong> and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await deleteBuyer(buyer.id);
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
