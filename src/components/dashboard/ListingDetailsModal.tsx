import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ContactSelect } from "@/components/ui/contact-select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Edit2, Save, X, CheckCircle2, ChevronDown, ChevronRight, Folder, Camera, Plus } from "lucide-react";
import { useState, useRef } from "react";
import { useTasks } from "@/contexts/TasksContext";
import TaskDetailsModal from "./TaskDetailsModal";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { ListingData } from "@/contexts/ListingsContext";

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
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"high" | "medium" | "low">("medium");
  const [newTaskNotes, setNewTaskNotes] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { tasks, openTaskModal, addTask } = useTasks();
  const { toast } = useToast();

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

  const updateField = (field: keyof ListingData, value: any) => {
    if (editedListing) {
      setEditedListing({ ...editedListing, [field]: value });
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
      address: listing.address,
      assignee: "",
      hasAIAssist: false,
      priority: newTaskPriority,
      notes: newTaskNotes,
      status: "pending",
      listingId: listing.id,
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

  const associatedTasks = tasks.filter((task) => task.listingId === listing.id);

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
            
            {/* Status Management Field */}
            <div>
              <Label className="text-sm font-medium text-text-muted">Status</Label>
              {isEditing ? (
                <Select
                  value={currentListing.status}
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
                <p className="text-base mt-1 font-medium">{currentListing.status}</p>
              )}
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

        {/* Add Task Dialog */}
        <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Task for {listing.address}</DialogTitle>
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
