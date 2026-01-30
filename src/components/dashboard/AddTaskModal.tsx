import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Users, Contact, Upload, X, FileIcon, Home, User } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useTasks } from "@/contexts/TasksContext";
import { useContacts } from "@/contexts/ContactsContext";
import { useBuyers } from "@/contexts/BuyersContext";
import { useListings } from "@/contexts/ListingsContext";
import { useTeamMembers } from "@/hooks/useTeamMembers";

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

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [selectedContactId, setSelectedContactId] = useState("");
  const [selectedAssigneeId, setSelectedAssigneeId] = useState("");
  const [selectedBuyerId, setSelectedBuyerId] = useState(initialBuyerId || "");
  const [selectedListingId, setSelectedListingId] = useState(initialListingId || "");
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dueDateError, setDueDateError] = useState(false);

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
      // Find the selected team member to get their name for the assignee field
      const selectedMember = teamMembers.find(m => m.userId === selectedAssigneeId);

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
        assignee: selectedMember?.name || "",
        hasAIAssist: false,
        contactId: selectedContactId || undefined,
        assigneeUserId: selectedAssigneeId || undefined,
        buyerId: selectedBuyerId && selectedBuyerId !== "none" ? selectedBuyerId : undefined,
        listingId: selectedListingId && selectedListingId !== "none" ? selectedListingId : undefined,
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
    setSelectedAssigneeId("");
    setSelectedBuyerId(initialBuyerId || "");
    setSelectedListingId(initialListingId || "");
    setAttachedFiles([]);
    setDueDateError(false);
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

          {/* Assign to Team Member - Always a clickable dropdown */}
          <div className="space-y-2">
            <Label className="text-text-heading flex items-center gap-2">
              <Users className="h-4 w-4" />
              Assign to Team Member
            </Label>
            <Select 
              value={selectedAssigneeId} 
              onValueChange={setSelectedAssigneeId}
              disabled={teamMembersLoading}
            >
              <SelectTrigger className="bg-background-elevated border-primary/25">
                <SelectValue
                  placeholder={
                    teamMembersLoading 
                      ? "Loading team members..." 
                      : teamMembers.length === 0 
                        ? "Add a team member to assign tasks" 
                        : "Select team member..."
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
                    <SelectItem value="none">None</SelectItem>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.userId} value={member.userId}>
                        {member.name}
                        {member.role === "owner" && (
                          <span className="ml-2 text-xs text-muted-foreground">(Owner)</span>
                        )}
                      </SelectItem>
                    ))}
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
