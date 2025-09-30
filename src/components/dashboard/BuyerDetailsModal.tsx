import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ContactSelect } from "@/components/ui/contact-select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Edit2, Save, X, CheckCircle2, ChevronDown, ChevronRight, Folder, Camera, Plus } from "lucide-react";
import { useState, useRef } from "react";
import { useTasks } from "@/contexts/TasksContext";
import TaskDetailsModal from "./TaskDetailsModal";
import { useToast } from "@/hooks/use-toast";

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
  onBuyerUpdate?: (updatedBuyer: BuyerData) => void;
}

export default function BuyerDetailsModal({ open, onOpenChange, buyer, onBuyerUpdate }: BuyerDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedBuyer, setEditedBuyer] = useState<BuyerData | null>(null);
  const [isPendingOpen, setIsPendingOpen] = useState(true);
  const [isCompletedOpen, setIsCompletedOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState<string>("");
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"high" | "medium" | "low">("medium");
  const [newTaskNotes, setNewTaskNotes] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { tasks, openTaskModal, addTask } = useTasks();
  const { toast } = useToast();

  if (!buyer) return null;

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
      setEditedBuyer({ ...editedBuyer, [field]: value });
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

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a task title",
        variant: "destructive",
      });
      return;
    }

    addTask({
      title: newTaskTitle,
      date: newTaskDueDate || new Date().toISOString().split('T')[0],
      dueDate: newTaskDueDate,
      address: buyer.name,
      assignee: "",
      hasAIAssist: false,
      priority: newTaskPriority,
      notes: newTaskNotes,
      status: "pending",
      buyerId: buyer.id,
    });

    setNewTaskTitle("");
    setNewTaskDueDate("");
    setNewTaskPriority("medium");
    setNewTaskNotes("");
    setIsAddTaskOpen(false);

    toast({
      title: "Task added",
      description: "New task has been created successfully",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-8">
          <div className="flex items-center justify-between">
            <DialogTitle>Buyer Details</DialogTitle>
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
          {/* Buyer Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-4 pb-4 border-b">
              <div className="relative">
                <img
                  src={displayImage}
                  alt={currentBuyer.name}
                  className="w-16 h-16 rounded-full object-cover"
                />
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

            {/* Status Management Field */}
            <div>
              <Label className="text-sm font-medium text-text-muted">Status</Label>
              {isEditing ? (
                <Select
                  value={currentBuyer.status}
                  onValueChange={(value) => updateField('status', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-base mt-1 font-medium">{currentBuyer.status}</p>
              )}
            </div>

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

        {/* Add Task Dialog */}
        <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Task for {buyer.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Task Title</Label>
                <Input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Enter task title"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={newTaskPriority} onValueChange={(value: any) => setNewTaskPriority(value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={newTaskNotes}
                  onChange={(e) => setNewTaskNotes(e.target.value)}
                  placeholder="Add any notes..."
                  className="mt-1"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsAddTaskOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddTask}>
                  Add Task
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
      <TaskDetailsModal />
    </Dialog>
  );
}
