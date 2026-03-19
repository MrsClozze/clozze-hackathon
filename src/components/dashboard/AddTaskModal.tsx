import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import ClozzeAIInlineAssistant from "@/components/assistant/ClozzeAIInlineAssistant";
import type { ParsedTaskData } from "@/hooks/useClozzeAICreate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CalendarIcon, Users, Contact, Upload, X, FileIcon, Home, User, CalendarPlus, Clock, Repeat } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useTasks, CalendarSyncTargets } from "@/contexts/TasksContext";
import { useContacts } from "@/contexts/ContactsContext";
import { useBuyers } from "@/contexts/BuyersContext";
import { useListings } from "@/contexts/ListingsContext";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useCalendarConnections } from "@/hooks/useCalendarConnections";
import { useTeamRole } from "@/hooks/useTeamRole";
import { isDemoId } from "@/data/demoData";

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
  const { buyers: allBuyers } = useBuyers();
  const { listings: allListings } = useListings();
  const { teamMembers, loading: teamMembersLoading } = useTeamMembers();
  const { connections: calendarConnections } = useCalendarConnections();
  const { isTeamOwner } = useTeamRole();

  // Filter out demo data - only show real buyers and listings
  const buyers = allBuyers.filter(b => !isDemoId(b.id));
  const listings = allListings.filter(l => !isDemoId(l.id));
  const hasNoLiveData = buyers.length === 0 && listings.length === 0;

  // Check if any external calendar is connected
  const hasConnectedCalendar = calendarConnections.some(c => c.syncEnabled);
  const connectedCalendarCount = calendarConnections.filter(c => c.syncEnabled).length;

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [dueTime, setDueTime] = useState<string>(""); // Start time in HH:mm format
  const [endTime, setEndTime] = useState<string>(""); // End time in HH:mm format
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [selectedContactId, setSelectedContactId] = useState("");
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]); // Changed to array
  const [selectedBuyerId, setSelectedBuyerId] = useState(initialBuyerId || "");
  const [selectedListingId, setSelectedListingId] = useState(initialListingId || "");
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dueDateError, setDueDateError] = useState(false);
  const [showOnCalendar, setShowOnCalendar] = useState(true); // Default ON
  const [syncToExternalCalendar, setSyncToExternalCalendar] = useState(false);
  const [syncTargetMode, setSyncTargetMode] = useState<"mine" | "all" | "selected">("mine");
  const [selectedSyncUserIds, setSelectedSyncUserIds] = useState<string[]>([]);
  const [recurrencePattern, setRecurrencePattern] = useState<string>("");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<Date | undefined>(undefined);
  const [includeWeekends, setIncludeWeekends] = useState(false);

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

      // Build calendar sync targets for admin users
      const calendarSyncTargets: CalendarSyncTargets | undefined = 
        syncToExternalCalendar && isTeamOwner && syncTargetMode !== "mine"
          ? {
              mode: syncTargetMode,
              userIds: syncTargetMode === "selected" ? selectedSyncUserIds : undefined,
            }
          : undefined;

      await addTask({
        title: title.trim(),
        notes: notes.trim(),
        startDate: startDate ? format(startDate, "yyyy-MM-dd") : undefined,
        dueDate: format(dueDate, "yyyy-MM-dd"),
        dueTime: dueTime || undefined,
        endTime: endTime || undefined,
        priority,
        status: "pending",
        date: format(dueDate, "MMM d, yyyy"),
        address: taskAddress,
        assignee: assigneeNames,
        hasAIAssist: false,
        contactId: selectedContactId || undefined,
        assigneeUserId: selectedAssigneeIds[0] || undefined,
        assigneeUserIds: selectedAssigneeIds,
        buyerId: selectedBuyerId && selectedBuyerId !== "none" ? selectedBuyerId : undefined,
        listingId: selectedListingId && selectedListingId !== "none" ? selectedListingId : undefined,
        showOnCalendar,
        syncToExternalCalendar: hasConnectedCalendar ? syncToExternalCalendar : false,
        calendarSyncTargets,
        recurrencePattern: recurrencePattern && recurrencePattern !== "none" ? recurrencePattern : undefined,
        recurrenceEndDate: recurrenceEndDate ? format(recurrenceEndDate, "yyyy-MM-dd") : undefined,
        includeWeekends: recurrencePattern === "daily" ? includeWeekends : undefined,
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
    setStartDate(undefined);
    setDueDate(undefined);
    setDueTime("");
    setEndTime("");
    setPriority("medium");
    setSelectedContactId("");
    setSelectedAssigneeIds([]);
    setSelectedBuyerId(initialBuyerId || "");
    setSelectedListingId(initialListingId || "");
    setAttachedFiles([]);
    setDueDateError(false);
    setShowOnCalendar(true);
    setSyncToExternalCalendar(false);
    setSyncTargetMode("mine");
    setSelectedSyncUserIds([]);
    setRecurrencePattern("");
    setRecurrenceEndDate(undefined);
    setIncludeWeekends(false);
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

          {/* Date Range: Start Date + Due Date */}
          <div className="space-y-2">
            <Label className="text-text-heading">
              Dates <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2">
              {/* Start Date (Optional) */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal bg-background-elevated border-primary/25",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "MMM d") : <span>Start date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-background z-50" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => {
                      setStartDate(date);
                      // Auto-set due date if start date is after current due date
                      if (date && dueDate && date > dueDate) {
                        setDueDate(undefined);
                      }
                    }}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              <span className="self-center text-muted-foreground text-sm">→</span>

              {/* Due Date (Required) */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal bg-background-elevated border-primary/25",
                      !dueDate && "text-muted-foreground",
                      dueDateError && "border-destructive"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "MMM d") : <span>Due date *</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-background z-50" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={handleDueDateSelect}
                    disabled={startDate ? (date) => date < startDate : undefined}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            {dueDateError && (
              <p className="text-sm text-destructive">Due date is required</p>
            )}
            <p className="text-xs text-muted-foreground">
              Start date is optional. Use it for tasks that span multiple days (e.g., inspection windows).
            </p>
          </div>

          {/* Start Time & End Time */}
          <div className="space-y-2">
            <Label className="text-text-heading">Time (Optional)</Label>
            <div className="flex items-center gap-2">
              {/* Start Time */}
              <div className="relative flex-1">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="time"
                  value={dueTime}
                  onChange={(e) => {
                    setDueTime(e.target.value);
                    // Auto-set end time to 1 hour after start if end time is empty or before start
                    if (e.target.value && (!endTime || endTime <= e.target.value)) {
                      const [hours, minutes] = e.target.value.split(':').map(Number);
                      const endHours = (hours + 1) % 24;
                      setEndTime(`${String(endHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
                    }
                  }}
                  className="pl-9 bg-background-elevated border-primary/25"
                  placeholder="Start"
                />
              </div>
              
              <span className="text-muted-foreground">to</span>
              
              {/* End Time */}
              <div className="relative flex-1">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="pl-9 bg-background-elevated border-primary/25"
                  placeholder="End"
                  disabled={!dueTime}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {hasConnectedCalendar
                ? "Tasks with a time will sync as timed events to your connected calendar. Without a time, they appear as all-day tasks."
                : "Leave blank for all-day tasks."}
            </p>
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

          {/* Recurrence */}
          <div className="space-y-3">
            <Label className="text-text-heading flex items-center gap-2">
              <Repeat className="h-4 w-4" />
              Repeat
            </Label>
            <Select value={recurrencePattern} onValueChange={setRecurrencePattern}>
              <SelectTrigger className="bg-background-elevated border-primary/25">
                <SelectValue placeholder="Does not repeat" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="none">Does not repeat</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Every 2 weeks</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>

            {recurrencePattern === "daily" && (
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="include-weekends" className="text-text-heading text-sm cursor-pointer">
                    Include weekends
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {includeWeekends ? "Tasks generated Mon–Sun" : "Weekdays only (Mon–Fri)"}
                  </p>
                </div>
                <Switch
                  id="include-weekends"
                  checked={includeWeekends}
                  onCheckedChange={setIncludeWeekends}
                />
              </div>
            )}

            {recurrencePattern && recurrencePattern !== "none" && (
              <div className="space-y-2">
                <Label className="text-text-heading text-sm">End date (optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-background-elevated border-primary/25",
                        !recurrenceEndDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {recurrenceEndDate ? format(recurrenceEndDate, "MMM d, yyyy") : "Repeats indefinitely"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-background z-50" align="start">
                    <Calendar
                      mode="single"
                      selected={recurrenceEndDate}
                      onSelect={setRecurrenceEndDate}
                      disabled={(date) => date < (dueDate || new Date())}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground">
                  3 upcoming instances will be generated automatically. New ones appear as you complete them.
                </p>
              </div>
            )}
          </div>

          {/* Calendar Toggles */}
          <div className="space-y-3 py-2 border-t border-b border-border/50">
            {/* Toggle A: Show on Dashboard Calendar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarPlus className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label htmlFor="show-on-calendar" className="text-text-heading cursor-pointer">
                    Show on dashboard calendar
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Task will appear on your Clozze calendar view
                  </p>
                </div>
              </div>
              <Switch
                id="show-on-calendar"
                checked={showOnCalendar}
                onCheckedChange={setShowOnCalendar}
              />
            </div>

            {/* Toggle B: Sync to Connected Calendar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarPlus className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label 
                    htmlFor="sync-to-calendar" 
                    className={`cursor-pointer ${hasConnectedCalendar ? 'text-text-heading' : 'text-muted-foreground'}`}
                  >
                    Sync to connected calendar{connectedCalendarCount > 1 ? 's' : ''}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {hasConnectedCalendar 
                      ? `Will create an event in your connected calendar${connectedCalendarCount > 1 ? 's' : ''}` 
                      : "Connect a calendar to enable"}
                  </p>
                </div>
              </div>
              <Switch
                id="sync-to-calendar"
                checked={syncToExternalCalendar}
                onCheckedChange={setSyncToExternalCalendar}
                disabled={!hasConnectedCalendar}
              />
            </div>

            {/* Admin Sync Target Selector - only when sync is enabled and user is admin */}
            {syncToExternalCalendar && isTeamOwner && teamMembers.length > 1 && (
              <div className="ml-6 space-y-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                <Label className="text-sm font-medium text-text-heading">Sync to:</Label>
                <RadioGroup 
                  value={syncTargetMode} 
                  onValueChange={(v) => setSyncTargetMode(v as "mine" | "all" | "selected")}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="mine" id="sync-mine" />
                    <Label htmlFor="sync-mine" className="text-sm cursor-pointer">My calendar only</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="sync-all" />
                    <Label htmlFor="sync-all" className="text-sm cursor-pointer">All team member calendars</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="selected" id="sync-selected" />
                    <Label htmlFor="sync-selected" className="text-sm cursor-pointer">Selected team member calendars</Label>
                  </div>
                </RadioGroup>

                {syncTargetMode === "selected" && (
                  <div className="space-y-2">
                    {selectedSyncUserIds.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedSyncUserIds.map(uid => {
                          const member = teamMembers.find(m => m.userId === uid);
                          if (!member) return null;
                          return (
                            <span key={uid} className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs">
                              {member.name}
                              <button type="button" onClick={() => setSelectedSyncUserIds(prev => prev.filter(id => id !== uid))} className="hover:bg-primary/20 rounded-full p-0.5">
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                    <Select value="" onValueChange={(uid) => { if (uid && !selectedSyncUserIds.includes(uid)) setSelectedSyncUserIds(prev => [...prev, uid]); }}>
                      <SelectTrigger className="bg-background-elevated border-primary/25 h-8 text-xs">
                        <SelectValue placeholder="Select team members..." />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {teamMembers
                          .filter(m => !selectedSyncUserIds.includes(m.userId))
                          .map(m => (
                            <SelectItem key={m.userId} value={m.userId}>{m.name}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Assign to Buyer (Optional) - Only show if not pre-filled */}
          {!initialBuyerId && (
            <div className="space-y-2">
              <Label className="text-text-heading flex items-center gap-2">
                <User className="h-4 w-4" />
                Buyer
                <span className="text-xs font-normal text-muted-foreground">(optional)</span>
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
                        : "None — standalone task"
                    } 
                  />
                </SelectTrigger>
                <SelectContent className="bg-background z-50 max-h-[200px]">
                  {buyers.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground text-center">
                      <User className="h-4 w-4 inline mr-2" />
                      No buyers yet
                    </div>
                  ) : (
                    <>
                      <SelectItem value="none">None — standalone task</SelectItem>
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

          {/* Assign to Listing (Optional) - Only show if not pre-filled */}
          {!initialListingId && (
            <div className="space-y-2">
              <Label className="text-text-heading flex items-center gap-2">
                <Home className="h-4 w-4" />
                Listing
                <span className="text-xs font-normal text-muted-foreground">(optional)</span>
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
                        : "None — standalone task"
                    } 
                  />
                </SelectTrigger>
                <SelectContent className="bg-background z-50 max-h-[200px]">
                  {listings.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground text-center">
                      <Home className="h-4 w-4 inline mr-2" />
                      No listings yet
                    </div>
                  ) : (
                    <>
                      <SelectItem value="none">None — standalone task</SelectItem>
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
