import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { CalendarIcon, Users, Contact, Upload, X, FileIcon, Home, User, CalendarPlus } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useTasks } from "@/contexts/TasksContext";
import { useContacts } from "@/contexts/ContactsContext";
import { useBuyers } from "@/contexts/BuyersContext";
import { useListings } from "@/contexts/ListingsContext";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useCalendarConnections } from "@/hooks/useCalendarConnections";

interface AddTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Optional props to pre-link task to buyer or listing
  buyerId?: string;
  listingId?: string;
  defaultAddress?: string;
}

interface AttachedFile {
  id: string;
  file: File;
  name: string;
}

export default function AddTaskModal({ 
  open, 
  onOpenChange,
  buyerId: initialBuyerId,
  listingId: initialListingId,
  defaultAddress = ""
}: AddTaskModalProps) {
  const { addTask } = useTasks();
  const { contacts, loading: contactsLoading } = useContacts();
  const { buyers } = useBuyers();
  const { listings } = useListings();
  const { teamMembers, loading: teamMembersLoading } = useTeamMembers();
  const { connections: calendarConnections } = useCalendarConnections();

  // Check if Google Calendar is connected
  const hasGoogleCalendar = calendarConnections.some(c => c.provider === "google" && c.syncEnabled);

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [selectedContactId, setSelectedContactId] = useState("");
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]); // Changed to array
  const [selectedBuyerId, setSelectedBuyerId] = useState(initialBuyerId || "");
  const [selectedListingId, setSelectedListingId] = useState(initialListingId || "");
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dueDateError, setDueDateError] = useState(false);
  const [showOnCalendar, setShowOnCalendar] = useState(false);

  // Update state when initial props change (e.g., opening from a buyer/listing profile)
  useEffect(() => {
    if (open) {
      setSelectedBuyerId(initialBuyerId || "");
      setSelectedListingId(initialListingId || "");
    }
  }, [open, initialBuyerId, initialListingId]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      return;
    }

    // Validate due date is required
    if (!dueDate) {
      setDueDateError(true);
      return;
    }

    setIsSubmitting(true);

    try {
      // Get names of selected assignees for the legacy assignee field
      const assigneeNames = selectedAssigneeIds
        .map(id => teamMembers.find(m => m.userId === id)?.name)
        .filter(Boolean)
        .join(", ");

      // Get the address from selected listing if available
      const selectedListing = listings.find(l => l.id === selectedListingId);
      const taskAddress = selectedListing?.address || defaultAddress;

      await addTask({
        title: title.trim(),
        notes: notes.trim(),
        dueDate: format(dueDate, "yyyy-MM-dd"),
        priority,
        status: "pending",
        date: format(dueDate, "MMM d, yyyy"),
        address: taskAddress,
        assignee: assigneeNames, // Legacy field with comma-separated names
        hasAIAssist: false,
        contactId: selectedContactId || undefined,
        assigneeUserId: selectedAssigneeIds[0] || undefined, // Keep first for backward compat
        assigneeUserIds: selectedAssigneeIds, // New: array of all assignees
        buyerId: selectedBuyerId && selectedBuyerId !== "none" ? selectedBuyerId : undefined,
        listingId: selectedListingId && selectedListingId !== "none" ? selectedListingId : undefined,
        showOnCalendar,
      });

      // TODO: Handle file attachments - for now just log them
      if (attachedFiles.length > 0) {
        console.log("Files to attach:", attachedFiles);
      }

      // Reset form
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating task:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setNotes("");
    setDueDate(undefined);
    setPriority("medium");
    setSelectedContactId("");
    setSelectedAssigneeIds([]);
    setSelectedBuyerId(initialBuyerId || "");
    setSelectedListingId(initialListingId || "");
    setAttachedFiles([]);
    setDueDateError(false);
    setShowOnCalendar(false);
  };

  const handleAddAssignee = (userId: string) => {
    if (userId && userId !== "none" && !selectedAssigneeIds.includes(userId)) {
      setSelectedAssigneeIds(prev => [...prev, userId]);
    }
  };

  const handleRemoveAssignee = (userId: string) => {
    setSelectedAssigneeIds(prev => prev.filter(id => id !== userId));
  };

  const handleCancel = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleDueDateSelect = (date: Date | undefined) => {
    setDueDate(date);
    if (date) {
      setDueDateError(false);
    }
  };

  // File handling
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;
    
    const newFiles: AttachedFile[] = Array.from(files).map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      name: file.name
    }));
    
    setAttachedFiles(prev => [...prev, ...newFiles]);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const removeFile = useCallback((fileId: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-background">
        <DialogHeader>
          <DialogTitle className="text-text-heading">Add New Task</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Create a new task with all required details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Task Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-text-heading">
              Task Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task description"
              required
              className="bg-background-elevated border-primary/25"
            />
          </div>

          {/* Due Date - Now Required */}
          <div className="space-y-2">
            <Label className="text-text-heading">
              Due Date <span className="text-destructive">*</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-background-elevated border-primary/25",
                    !dueDate && "text-muted-foreground",
                    dueDateError && "border-destructive"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-background z-50" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={handleDueDateSelect}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            {dueDateError && (
              <p className="text-sm text-destructive">Due date is required</p>
            )}
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label className="text-text-heading">Priority Level</Label>
            <Select value={priority} onValueChange={(value: "high" | "medium" | "low") => setPriority(value)}>
              <SelectTrigger className="bg-background-elevated border-primary/25">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="high">High Priority</SelectItem>
                <SelectItem value="medium">Medium Priority</SelectItem>
                <SelectItem value="low">Low Priority</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Show on Calendar Toggle */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <CalendarPlus className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label htmlFor="show-on-calendar" className="text-text-heading cursor-pointer">
                  Add to Calendar
                </Label>
                <p className="text-xs text-muted-foreground">
                  {hasGoogleCalendar 
                    ? "Will appear on dashboard & sync to Google Calendar" 
                    : "Will appear on your dashboard calendar"}
                </p>
              </div>
            </div>
            <Switch
              id="show-on-calendar"
              checked={showOnCalendar}
              onCheckedChange={setShowOnCalendar}
            />
          </div>

          {/* Assign to Buyer - Only show if not pre-filled */}
          {!initialBuyerId && (
            <div className="space-y-2">
              <Label className="text-text-heading flex items-center gap-2">
                <User className="h-4 w-4" />
                Assign to Buyer
              </Label>
              <Select 
                value={selectedBuyerId} 
                onValueChange={(value) => {
                  setSelectedBuyerId(value);
                  // Clear listing if buyer is selected (task can only be linked to one)
                  if (value && value !== "none") {
                    setSelectedListingId("");
                  }
                }}
              >
              <SelectTrigger className="bg-background-elevated border-primary/25">
                <SelectValue
                    placeholder={
                      buyers.length === 0 
                        ? "No buyers available" 
                        : "Select a buyer..."
                    } 
                  />
                </SelectTrigger>
                <SelectContent className="bg-background z-50 max-h-[200px]">
                  {buyers.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground text-center">
                      <User className="h-4 w-4 inline mr-2" />
                      Add a buyer to assign tasks
                    </div>
                  ) : (
                    <>
                      <SelectItem value="none">None</SelectItem>
                      {buyers.map((buyer) => (
                        <SelectItem key={buyer.id} value={buyer.id}>
                          {buyer.firstName} {buyer.lastName}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Assign to Listing - Only show if not pre-filled */}
          {!initialListingId && (
            <div className="space-y-2">
              <Label className="text-text-heading flex items-center gap-2">
                <Home className="h-4 w-4" />
                Assign to Listing
              </Label>
              <Select 
                value={selectedListingId} 
                onValueChange={(value) => {
                  setSelectedListingId(value);
                  // Clear buyer if listing is selected (task can only be linked to one)
                  if (value && value !== "none") {
                    setSelectedBuyerId("");
                  }
                }}
              >
              <SelectTrigger className="bg-background-elevated border-primary/25">
                <SelectValue
                    placeholder={
                      listings.length === 0 
                        ? "No listings available" 
                        : "Select a listing..."
                    } 
                  />
                </SelectTrigger>
                <SelectContent className="bg-background z-50 max-h-[200px]">
                  {listings.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground text-center">
                      <Home className="h-4 w-4 inline mr-2" />
                      Add a listing to assign tasks
                    </div>
                  ) : (
                    <>
                      <SelectItem value="none">None</SelectItem>
                      {listings.map((listing) => (
                        <SelectItem key={listing.id} value={listing.id}>
                          {listing.address}, {listing.city}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Assign to Team Members - Multi-select with chips */}
          <div className="space-y-2">
            <Label className="text-text-heading flex items-center gap-2">
              <Users className="h-4 w-4" />
              Assign to Team Members
            </Label>
            
            {/* Selected assignees as removable chips */}
            {selectedAssigneeIds.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedAssigneeIds.map(userId => {
                  const member = teamMembers.find(m => m.userId === userId);
                  if (!member) return null;
                  return (
                    <div
                      key={userId}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-sm"
                    >
                      <span>{member.name}</span>
                      {member.role === "owner" && (
                        <span className="text-xs opacity-70">(Owner)</span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveAssignee(userId)}
                        className="ml-0.5 hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Dropdown to add more assignees */}
            <Select 
              value="" 
              onValueChange={handleAddAssignee}
              disabled={teamMembersLoading}
            >
              <SelectTrigger className="bg-background-elevated border-primary/25">
                <SelectValue
                  placeholder={
                    teamMembersLoading 
                      ? "Loading team members..." 
                      : teamMembers.length === 0 
                        ? "Add a team member to assign tasks" 
                        : selectedAssigneeIds.length > 0
                          ? "Add another team member..."
                          : "Select team members..."
                  } 
                />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {teamMembers.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground text-center">
                    <Users className="h-4 w-4 inline mr-2" />
                    Add a team member to assign tasks
                  </div>
                ) : (
                  <>
                    {/* Only show team members not already selected */}
                    {teamMembers
                      .filter(member => !selectedAssigneeIds.includes(member.userId))
                      .map((member) => (
                        <SelectItem key={member.userId} value={member.userId}>
                          {member.name}
                          {member.role === "owner" && (
                            <span className="ml-2 text-xs text-muted-foreground">(Owner)</span>
                          )}
                        </SelectItem>
                      ))}
                    {teamMembers.filter(m => !selectedAssigneeIds.includes(m.userId)).length === 0 && (
                      <div className="p-3 text-sm text-muted-foreground text-center">
                        All team members assigned
                      </div>
                    )}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Contact - Always a clickable dropdown */}
          <div className="space-y-2">
            <Label className="text-text-heading flex items-center gap-2">
              <Contact className="h-4 w-4" />
              Contact
            </Label>
            <Select 
              value={selectedContactId} 
              onValueChange={setSelectedContactId}
              disabled={contactsLoading}
            >
              <SelectTrigger className="bg-background-elevated border-primary/25">
                <SelectValue
                  placeholder={
                    contactsLoading 
                      ? "Loading contacts..." 
                      : contacts.length === 0 
                        ? "Load contacts to show available contacts" 
                        : "Select a contact..."
                  } 
                />
              </SelectTrigger>
              <SelectContent className="bg-background z-50 max-h-[200px]">
                {contacts.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground text-center">
                    <Contact className="h-4 w-4 inline mr-2" />
                    Load contacts to show available contacts
                  </div>
                ) : (
                  <>
                    <SelectItem value="none">None</SelectItem>
                    {contacts.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.first_name} {contact.last_name}
                        {contact.company && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({contact.company})
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-text-heading">
              Notes
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add additional details..."
              className="min-h-[80px] bg-background-elevated border-primary/25"
            />
          </div>

          {/* File Attachments */}
          <div className="space-y-2">
            <Label className="text-text-heading flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Attachments
            </Label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                isDragOver 
                  ? "border-primary bg-primary/10" 
                  : "border-primary/25 hover:border-primary/50 hover:bg-primary/5"
              )}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Drag and drop files here or click to browse files
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
            
            {/* Attached Files List */}
            {attachedFiles.length > 0 && (
              <div className="space-y-2 mt-3">
                {attachedFiles.map((file) => (
                  <div 
                    key={file.id}
                    className="flex items-center justify-between p-2 bg-muted/30 rounded-md"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <span className="text-sm truncate">{file.name}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(file.id);
                      }}
                      className="h-6 w-6 p-0 flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !title.trim() || !dueDate}>
              {isSubmitting ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
