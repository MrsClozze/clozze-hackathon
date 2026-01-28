import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Users, Contact } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useTasks } from "@/contexts/TasksContext";
import { useContacts } from "@/contexts/ContactsContext";
import { useTeamMembers } from "@/hooks/useTeamMembers";

interface AddTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AddTaskModal({ open, onOpenChange }: AddTaskModalProps) {
  const { addTask } = useTasks();
  const { contacts, loading: contactsLoading } = useContacts();
  const { teamMembers, loading: teamMembersLoading } = useTeamMembers();

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [selectedContactId, setSelectedContactId] = useState("");
  const [selectedAssigneeId, setSelectedAssigneeId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Find the selected team member to get their name for the assignee field
      const selectedMember = teamMembers.find(m => m.userId === selectedAssigneeId);

      await addTask({
        title: title.trim(),
        notes: notes.trim(),
        dueDate: dueDate ? format(dueDate, "yyyy-MM-dd") : undefined,
        priority,
        status: "pending",
        date: dueDate ? format(dueDate, "MMM d, yyyy") : "",
        address: "",
        assignee: selectedMember?.name || "",
        hasAIAssist: false,
        // These will be handled by the context/database
        contactId: selectedContactId || undefined,
        assigneeUserId: selectedAssigneeId || undefined,
      });

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
  };

  const handleCancel = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-background">
        <DialogHeader>
          <DialogTitle className="text-text-heading">Add New Task</DialogTitle>
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
              className="bg-background-elevated"
            />
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label className="text-text-heading">Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-background-elevated",
                    !dueDate && "text-muted-foreground"
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
                  onSelect={setDueDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label className="text-text-heading">Priority Level</Label>
            <Select value={priority} onValueChange={(value: "high" | "medium" | "low") => setPriority(value)}>
              <SelectTrigger className="bg-background-elevated">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="high">High Priority</SelectItem>
                <SelectItem value="medium">Medium Priority</SelectItem>
                <SelectItem value="low">Low Priority</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Assign to Team Member */}
          <div className="space-y-2">
            <Label className="text-text-heading flex items-center gap-2">
              <Users className="h-4 w-4" />
              Assign to Team Member
            </Label>
            {teamMembersLoading ? (
              <div className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-md">
                Loading team members...
              </div>
            ) : teamMembers.length === 0 ? (
              <div className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-md border border-dashed">
                <Users className="h-4 w-4 inline mr-2" />
                Add a team member to assign tasks
              </div>
            ) : (
              <Select value={selectedAssigneeId} onValueChange={setSelectedAssigneeId}>
                <SelectTrigger className="bg-background-elevated">
                  <SelectValue placeholder="Select team member..." />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="">None</SelectItem>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.userId} value={member.userId}>
                      {member.name}
                      {member.role === "owner" && (
                        <span className="ml-2 text-xs text-muted-foreground">(Owner)</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Contact */}
          <div className="space-y-2">
            <Label className="text-text-heading flex items-center gap-2">
              <Contact className="h-4 w-4" />
              Contact
            </Label>
            {contactsLoading ? (
              <div className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-md">
                Loading contacts...
              </div>
            ) : contacts.length === 0 ? (
              <div className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-md border border-dashed">
                <Contact className="h-4 w-4 inline mr-2" />
                Load contacts to show list of available contacts
              </div>
            ) : (
              <Select value={selectedContactId} onValueChange={setSelectedContactId}>
                <SelectTrigger className="bg-background-elevated">
                  <SelectValue placeholder="Select a contact..." />
                </SelectTrigger>
                <SelectContent className="bg-background z-50 max-h-[200px]">
                  <SelectItem value="">None</SelectItem>
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
                </SelectContent>
              </Select>
            )}
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
              className="min-h-[80px] bg-background-elevated"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !title.trim()}>
              {isSubmitting ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
