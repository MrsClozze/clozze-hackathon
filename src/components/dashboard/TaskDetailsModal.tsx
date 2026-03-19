import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import TaskAssistantPanel from "@/components/assistant/TaskAssistantPanel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Clock, Edit2, Save, X, Mail, MessageSquare, Trash2, Users, Contact, CalendarIcon, Send } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useTasks, Task } from "@/contexts/TasksContext";
import { useContacts } from "@/contexts/ContactsContext";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useCalendarConnections } from "@/hooks/useCalendarConnections";
import { SendWithDocuSignModal } from "@/components/integrations/SendWithDocuSignModal";

import { useDocuSignAuth } from "@/hooks/useDocuSignAuth";
import { useBuyers } from "@/contexts/BuyersContext";
import { useListings } from "@/contexts/ListingsContext";

export default function TaskDetailsModal() {
  const {
    selectedTask,
    isTaskDetailsModalOpen,
    setIsTaskDetailsModalOpen,
    updateTask,
    deleteTask,
  } = useTasks();

  const { contacts, loading: contactsLoading } = useContacts();
  const { teamMembers, loading: teamMembersLoading } = useTeamMembers();
  const { connections: calendarConnections } = useCalendarConnections();
  const hasCalendarConnections = calendarConnections.filter(c => c.isOwned).length > 0;
  const { isConnected: isDocuSignConnected } = useDocuSignAuth();
  const { buyers } = useBuyers();
  const { listings } = useListings();
  const [isDocuSignModalOpen, setIsDocuSignModalOpen] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState<Task | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedStartDate, setSelectedStartDate] = useState<Date | undefined>(undefined);
  const [editedTime, setEditedTime] = useState<string>("");
  const [showPartnerChoice, setShowPartnerChoice] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isComingSoonModalOpen, setIsComingSoonModalOpen] = useState(false);
  
  // Team member assignment state
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string>("");

  // Initialize state when entering edit mode
  useEffect(() => {
    if (isEditing && selectedTask) {
      const assignees = selectedTask.assigneeUserIds || 
        (selectedTask.assigneeUserId ? [selectedTask.assigneeUserId] : []);
      setSelectedAssigneeIds(assignees);
      setSelectedContactId(selectedTask.contactId || "");
      setEditedTime(selectedTask.dueTime || "");
      
      // Initialize start date
      if (selectedTask.startDate) {
        const parsedStart = new Date(selectedTask.startDate);
        if (!isNaN(parsedStart.getTime())) {
          setSelectedStartDate(parsedStart);
        }
      }
      
      if (selectedTask.date) {
        const parsedDate = new Date(selectedTask.date);
        if (!isNaN(parsedDate.getTime())) {
          setSelectedDate(parsedDate);
        }
      }
    }
  }, [isEditing, selectedTask]);

  const handleEditToggle = () => {
    if (!isEditing) {
      setEditedTask(selectedTask);
    }
    setIsEditing(!isEditing);
  };

  const handleAddAssignee = (userId: string) => {
    if (userId && userId !== "none" && !selectedAssigneeIds.includes(userId)) {
      setSelectedAssigneeIds(prev => [...prev, userId]);
    }
  };

  const handleRemoveAssignee = (userId: string) => {
    setSelectedAssigneeIds(prev => prev.filter(id => id !== userId));
  };

  const handleSaveTask = async () => {
    if (editedTask && selectedTask) {
      // Get names of selected assignees for the legacy assignee field
      const assigneeNames = selectedAssigneeIds
        .map(id => teamMembers.find(m => m.userId === id)?.name)
        .filter(Boolean)
        .join(", ");

      const newDueDate = selectedDate ? format(selectedDate, "yyyy-MM-dd") : editedTask.dueDate;
      const newDisplayDate = selectedDate ? format(selectedDate, "MMM d, yyyy") : editedTask.date;

      await updateTask(selectedTask.id, {
        ...editedTask,
        date: newDisplayDate,
        dueDate: newDueDate,
        startDate: selectedStartDate ? format(selectedStartDate, "yyyy-MM-dd") : undefined,
        dueTime: editedTime || undefined,
        assignee: assigneeNames || undefined,
        assigneeUserId: selectedAssigneeIds[0] || undefined,
        assigneeUserIds: selectedAssigneeIds,
        contactId: selectedContactId && selectedContactId !== "none" ? selectedContactId : undefined,
      });
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedTask(selectedTask);
    setSelectedAssigneeIds([]);
    setSelectedContactId("");
    setEditedTime("");
    setSelectedDate(undefined);
    setSelectedStartDate(undefined);
    setIsEditing(false);
  };

  const handleDeleteTask = async () => {
    if (selectedTask && confirm("Are you sure you want to delete this task?")) {
      await deleteTask(selectedTask.id);
    }
  };

  const handleCloseModal = (open: boolean) => {
    setIsTaskDetailsModalOpen(open);
    if (!open) {
      setIsEditing(false);
      setShowPartnerChoice(false);
      setSelectedAssigneeIds([]);
      setSelectedContactId("");
      setEditedTime("");
      setSelectedDate(undefined);
      setSelectedStartDate(undefined);
    }
  };

  // Helper to format 24-hour time to 12-hour format
  const formatTimeTo12Hour = (time24: string | undefined): string => {
    if (!time24) return "No time set";
    
    const [hours, minutes] = time24.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return time24;
    
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  if (!selectedTask) return null;

  const currentTask = isEditing && editedTask ? editedTask : selectedTask;
  
  // Get display names for current assignees (non-edit view)
  const currentAssigneeNames = (currentTask.assigneeUserIds || [])
    .map(id => teamMembers.find(m => m.userId === id)?.name)
    .filter(Boolean);
  
  // Get current contact name (non-edit view)
  const currentContact = contacts.find(c => c.id === currentTask.contactId);

  return (
    <>
      <Dialog open={isTaskDetailsModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-5xl max-h-[90vh] p-0 overflow-hidden">
          <div className="flex h-[85vh] max-h-[85vh]">
            {/* Left Panel - Task Details */}
            <div className="flex-1 overflow-y-auto p-6 min-w-0">
          <DialogHeader>
            <div className="flex items-center justify-between pr-8">
              <div className="flex-1">
                <DialogTitle className="text-xl">
                  {isEditing ? "Edit Task" : currentTask.title}
                </DialogTitle>
                <DialogDescription>
                  {isEditing ? "Update task details" : "Complete task details and information"}
                </DialogDescription>
              </div>
              {!isEditing && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleEditToggle}
                  className="gap-2 flex-shrink-0"
                >
                  <Edit2 className="h-4 w-4" />
                  Edit
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Task Title */}
            <div>
              <Label className="text-sm font-medium text-text-muted mb-1">Task Title</Label>
              {isEditing ? (
                <Input
                  value={editedTask?.title || ""}
                  onChange={(e) =>
                    setEditedTask(editedTask ? { ...editedTask, title: e.target.value } : null)
                  }
                  className="mt-1"
                />
              ) : (
                <div className="text-sm mt-1">{currentTask.title}</div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Date */}
              <div>
                <Label className="text-sm font-medium text-text-muted mb-1">Date</Label>
                {isEditing ? (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal mt-1",
                          !editedTask?.date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {editedTask?.date || "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-auto p-0 z-[80] bg-card text-card-foreground border border-border shadow-elevated"
                      align="start"
                      sideOffset={4}
                    >
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          setSelectedDate(date);
                          if (date && editedTask) {
                            setEditedTask({ ...editedTask, date: format(date, "MMM dd, yyyy") });
                          }
                        }}
                        initialFocus
                        className="p-3 pointer-events-auto bg-card text-card-foreground rounded-md"
                      />
                    </PopoverContent>
                  </Popover>
                ) : (
                  <div className="flex items-center gap-2 text-sm mt-1">
                    <CalendarIcon className="h-4 w-4 text-accent-gold" />
                    {currentTask.date || "No date set"}
                  </div>
                )}
              </div>

              {/* Time */}
              <div>
                <Label className="text-sm font-medium text-text-muted mb-1">Time</Label>
                {isEditing ? (
                  <Input
                    type="time"
                    value={editedTime}
                    onChange={(e) => setEditedTime(e.target.value)}
                    className="mt-1 cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100"
                    onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                  />
                ) : (
                  <div className="flex items-center gap-2 text-sm mt-1">
                    <Clock className="h-4 w-4 text-accent-gold" />
                    {formatTimeTo12Hour(currentTask.dueTime)}
                  </div>
                )}
              </div>
            </div>

            {/* Priority */}
            <div>
              <Label className="text-sm font-medium text-text-muted mb-1">Priority</Label>
              {isEditing ? (
                <Select
                  value={editedTask?.priority}
                  onValueChange={(value: "high" | "medium" | "low") =>
                    setEditedTask(editedTask ? { ...editedTask, priority: value } : null)
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center gap-2 mt-1">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      currentTask.priority === "high" ? "bg-destructive" : "bg-warning"
                    }`}
                  />
                  <span className="text-sm capitalize">{currentTask.priority}</span>
                </div>
              )}
            </div>

            {/* Address */}
            <div>
              <Label className="text-sm font-medium text-text-muted mb-1">Address</Label>
              {isEditing ? (
                <Input
                  value={editedTask?.address || ""}
                  onChange={(e) =>
                    setEditedTask(editedTask ? { ...editedTask, address: e.target.value } : null)
                  }
                  className="mt-1"
                />
              ) : (
                <div className="text-sm mt-1">{currentTask.address || "N/A"}</div>
              )}
            </div>

            {/* Assign to Team Members */}
            <div>
              <Label className="text-sm font-medium text-text-muted mb-1 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Assign to Team Members
              </Label>
              {isEditing ? (
                <div className="space-y-2 mt-1">
                  {/* Selected assignees as removable chips */}
                  {selectedAssigneeIds.length > 0 && (
                    <div className="flex flex-wrap gap-2">
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
                              ? "No team members available" 
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
                          No team members available
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
              ) : (
                <div className="text-sm mt-1">
                  {currentAssigneeNames.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {currentAssigneeNames.map((name, idx) => (
                        <span 
                          key={idx}
                          className="inline-flex items-center px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    currentTask.assignee || "Unassigned"
                  )}
                </div>
              )}
            </div>

            {/* Contact */}
            <div>
              <Label className="text-sm font-medium text-text-muted mb-1 flex items-center gap-2">
                <Contact className="h-4 w-4" />
                Contact
              </Label>
              {isEditing ? (
                <Select 
                  value={selectedContactId} 
                  onValueChange={setSelectedContactId}
                  disabled={contactsLoading}
                >
                  <SelectTrigger className="mt-1 bg-background-elevated border-primary/25">
                    <SelectValue
                      placeholder={
                        contactsLoading 
                          ? "Loading contacts..." 
                          : contacts.length === 0 
                            ? "No contacts available" 
                            : "Select a contact..."
                      } 
                    />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50 max-h-[200px]">
                    {contacts.length === 0 ? (
                      <div className="p-3 text-sm text-muted-foreground text-center">
                        <Contact className="h-4 w-4 inline mr-2" />
                        Add contacts to assign them to tasks
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
              ) : (
                <div className="text-sm mt-1">
                  {currentContact 
                    ? `${currentContact.first_name} ${currentContact.last_name}${currentContact.company ? ` (${currentContact.company})` : ''}`
                    : "No contact assigned"
                  }
                </div>
              )}
            </div>

            {/* Status */}
            {currentTask.status && (
              <div>
                <Label className="text-sm font-medium text-text-muted mb-1">Status</Label>
                {isEditing ? (
                  <Select
                    value={editedTask?.status}
                    onValueChange={(value: "pending" | "in-progress" | "completed") =>
                      setEditedTask(editedTask ? { ...editedTask, status: value } : null)
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="text-sm mt-1 capitalize">{currentTask.status}</div>
                )}
              </div>
            )}

            {/* Notes Section */}
            <div>
              <Label className="text-sm font-medium text-text-muted mb-1">Notes</Label>
              {isEditing ? (
                <Textarea
                  value={editedTask?.notes || ""}
                  onChange={(e) =>
                    setEditedTask(editedTask ? { ...editedTask, notes: e.target.value } : null)
                  }
                  placeholder="Add any additional notes or details..."
                  className="mt-1 min-h-[100px]"
                />
              ) : (
                <div className="text-sm mt-1 min-h-[60px] p-3 rounded-md bg-muted/30 border">
                  {currentTask.notes || "No notes added"}
                </div>
              )}
            </div>

            {/* Sync to External Calendar */}
            {isEditing && hasCalendarConnections && (
              <div className="flex items-center justify-between p-3 rounded-md bg-muted/30 border">
                <div>
                  <Label className="text-sm font-medium">Sync to connected calendar(s)</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Push this task to your connected Google or Apple Calendar
                  </p>
                </div>
                <Switch
                  checked={editedTask?.syncToExternalCalendar ?? false}
                  onCheckedChange={(checked) =>
                    setEditedTask(editedTask ? { ...editedTask, syncToExternalCalendar: checked } : null)
                  }
                />
              </div>
            )}
            {!isEditing && hasCalendarConnections && (
              <div className="flex items-center justify-between p-3 rounded-md bg-muted/30 border">
                <div>
                  <Label className="text-sm font-medium">Sync to connected calendar(s)</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {currentTask.syncToExternalCalendar ? "This task is synced to your external calendar" : "Not synced to external calendar"}
                  </p>
                </div>
                <div className={cn("text-xs font-medium px-2 py-1 rounded", currentTask.syncToExternalCalendar ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                  {currentTask.syncToExternalCalendar ? "Synced" : "Not synced"}
                </div>
              </div>
            )}

            {/* Edit Actions */}
            {isEditing && (
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={handleSaveTask}
                  className="flex-1 bg-accent-gold text-accent-gold-foreground hover:bg-accent-gold/90"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleDeleteTask}
                  className="px-3"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}


            {/* AI Assist Section */}
            {!isEditing && (
              <div className="pt-4 border-t border-border space-y-2">
                <Label className="text-sm font-medium text-text-muted mb-2">Use Clozze AI Assist</Label>
                
                {/* Send with DocuSign */}
                <Button
                  variant="outline"
                  className="w-full gap-2 text-primary border-primary/30 hover:bg-primary/10"
                  onClick={() => setIsDocuSignModalOpen(true)}
                >
                  <Send className="h-4 w-4" />
                  Send with DocuSign
                </Button>

                {(currentTask.assignee || currentAssigneeNames.length > 0) && (
                  <Button
                    variant="outline"
                    className="w-full gap-2 text-accent-gold border-accent-gold hover:bg-accent-gold hover:text-accent-gold-foreground"
                    onClick={() => setIsContactModalOpen(true)}
                  >
                    <Mail className="h-4 w-4" />
                    <MessageSquare className="h-4 w-4" />
                    Message with AI Assist
                  </Button>
                )}
                
                {/* Template Loading - Show for Contact Preparation Tasks */}
                {(currentTask.title.toLowerCase().includes("prepare contract") || 
                  currentTask.title.toLowerCase().includes("prepare contact")) && (
                  <Button
                    variant="outline"
                    className="w-full gap-2 text-accent-gold border-accent-gold hover:bg-accent-gold hover:text-accent-gold-foreground"
                    onClick={() => setIsComingSoonModalOpen(true)}
                  >
                    Load Contract Template
                  </Button>
                )}

                {/* Partner Options inside AI Assist */}
                {(currentTask.title.toLowerCase().includes("pre") || 
                  currentTask.title.toLowerCase().includes("lender") ||
                  currentTask.title.toLowerCase().includes("approval")) && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full bg-partner-action text-partner-action-foreground border-partner-action hover:bg-partner-action/90"
                      onClick={() => setShowPartnerChoice(!showPartnerChoice)}
                    >
                      {showPartnerChoice ? "Hide Partner Options" : "Show Partner Options"}
                    </Button>

                    {showPartnerChoice && (
                      <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg bg-muted/20">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-auto flex-col gap-2 py-3"
                          onClick={() => {
                            setShowPartnerChoice(false);
                          }}
                        >
                          <div className="font-medium text-xs">Use My Own Contact</div>
                          <div className="text-[10px] text-muted-foreground">Your lender</div>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-auto flex-col gap-2 py-3"
                          onClick={() => {
                            setIsComingSoonModalOpen(true);
                            setShowPartnerChoice(false);
                          }}
                        >
                          <div className="font-medium text-xs">Use Preferred Partner</div>
                          <div className="text-[10px] text-muted-foreground">Our lender</div>
                        </Button>
                      </div>
                    )}
                  </>
                )}

                {/* Show message when no assignee and no template */}
                {!currentTask.assignee && currentAssigneeNames.length === 0 &&
                 !(currentTask.title.toLowerCase().includes("prepare contract") || 
                   currentTask.title.toLowerCase().includes("prepare contact")) && (
                  <p className="text-sm text-text-muted italic">
                    Assign a team member or contact to enable AI Assist messaging
                  </p>
                )}
              </div>
            )}
            </div>
            </div>

            {/* Right Panel - AI Assistant */}
            {!isEditing && selectedTask && !selectedTask.isDemo && (
              <div className="w-[400px] flex-shrink-0 hidden lg:flex">
                <TaskAssistantPanel
                  task={selectedTask}
                  onRefreshTask={() => {
                    // Trigger refetch of the task
                  }}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Contact Modal */}
      <Dialog open={isContactModalOpen} onOpenChange={setIsContactModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Contact with AI Assist</DialogTitle>
            <DialogDescription>Choose how you'd like to contact the assignee</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <Button variant="outline" className="h-24 flex-col gap-2">
              <Mail className="h-6 w-6" />
              <span>Email</span>
            </Button>
            <Button variant="outline" className="h-24 flex-col gap-2">
              <MessageSquare className="h-6 w-6" />
              <span>Text Message</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Coming Soon Modal */}
      <Dialog open={isComingSoonModalOpen} onOpenChange={setIsComingSoonModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Feature Coming Soon</DialogTitle>
            <DialogDescription>This feature is currently in development</DialogDescription>
          </DialogHeader>
          <div className="py-6 text-center">
            <div className="text-lg font-medium text-text-heading mb-2">Coming Soon</div>
            <p className="text-text-muted">
              This feature is currently in development and will be available soon.
            </p>
          </div>
          <div className="flex justify-center">
            <Button onClick={() => setIsComingSoonModalOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send with DocuSign Modal */}
      {selectedTask && (
        <SendWithDocuSignModal
          open={isDocuSignModalOpen}
          onOpenChange={setIsDocuSignModalOpen}
          taskId={selectedTask.id}
          buyerId={selectedTask.buyerId}
          listingId={selectedTask.listingId}
          defaultRecipients={(() => {
            const recipients: { name: string; email: string }[] = [];
            if (selectedTask.buyerId) {
              const buyer = buyers.find(b => b.id === selectedTask.buyerId);
              if (buyer) recipients.push({ name: `${buyer.firstName} ${buyer.lastName}`, email: buyer.email });
            }
            if (selectedTask.listingId) {
              const listing = listings.find(l => l.id === selectedTask.listingId);
              if (listing?.sellerEmail && listing?.sellerFirstName) {
                recipients.push({ name: `${listing.sellerFirstName} ${listing.sellerLastName || ''}`.trim(), email: listing.sellerEmail });
              }
            }
            return recipients;
          })()}
          defaultSubject={selectedTask.title ? `Please sign: ${selectedTask.title}` : ""}
        />
      )}
    </>
  );
}
