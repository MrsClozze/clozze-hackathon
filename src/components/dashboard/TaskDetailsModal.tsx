import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { ContactSelect } from "@/components/ui/contact-select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Clock, Edit2, Save, X, Mail, MessageSquare, Trash2 } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useTasks, Task } from "@/contexts/TasksContext";

export default function TaskDetailsModal() {
  const {
    selectedTask,
    isTaskDetailsModalOpen,
    setIsTaskDetailsModalOpen,
    updateTask,
    deleteTask,
  } = useTasks();

  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState<Task | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [showPartnerChoice, setShowPartnerChoice] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isComingSoonModalOpen, setIsComingSoonModalOpen] = useState(false);

  const handleEditToggle = () => {
    if (!isEditing) {
      setEditedTask(selectedTask);
    }
    setIsEditing(!isEditing);
  };

  const handleSaveTask = () => {
    if (editedTask && selectedTask) {
      updateTask(selectedTask.id, editedTask);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedTask(selectedTask);
    setIsEditing(false);
  };

  const handleDeleteTask = () => {
    if (selectedTask && confirm("Are you sure you want to delete this task?")) {
      deleteTask(selectedTask.id);
    }
  };

  const handleCloseModal = (open: boolean) => {
    setIsTaskDetailsModalOpen(open);
    if (!open) {
      setIsEditing(false);
      setShowPartnerChoice(false);
    }
  };

  if (!selectedTask) return null;

  const currentTask = isEditing && editedTask ? editedTask : selectedTask;

  return (
    <>
      <Dialog open={isTaskDetailsModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-lg">
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
                        <Clock className="mr-2 h-4 w-4" />
                        {editedTask?.date || "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
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
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                ) : (
                  <div className="flex items-center gap-2 text-sm mt-1">
                    <Clock className="h-4 w-4 text-accent-gold" />
                    {currentTask.date}
                  </div>
                )}
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

            {/* Assigned To / Contact */}
            <div>
              <Label className="text-sm font-medium text-text-muted mb-1">Assigned To</Label>
              {isEditing ? (
                <div className="space-y-2 mt-1">
                  <ContactSelect
                    value={editedTask?.assignee || ""}
                    onValueChange={(value) =>
                      setEditedTask(editedTask ? { ...editedTask, assignee: value } : null)
                    }
                    placeholder="Select contact..."
                  />

                  {/* Special Partner Flow for Lender/Pre-Approval Tasks */}
                  {(editedTask?.title.toLowerCase().includes("pre-approved") || 
                    editedTask?.title.toLowerCase().includes("lender")) && (
                    <div className="space-y-2">
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
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm mt-1">{currentTask.assignee || "Unassigned"}</div>
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

            {/* AI Assist Section - Show when task has an assignee */}
            {!isEditing && currentTask.assignee && (
              <div className="pt-4 border-t border-border">
                <Label className="text-sm font-medium text-text-muted mb-2">AI Assist</Label>
                <Button
                  variant="outline"
                  className="w-full gap-2 text-accent-gold border-accent-gold hover:bg-accent-gold hover:text-accent-gold-foreground"
                  onClick={() => setIsContactModalOpen(true)}
                >
                  <Mail className="h-4 w-4" />
                  <MessageSquare className="h-4 w-4" />
                  Contact with AI Assist
                </Button>
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
            <DialogTitle>Preferred Partner</DialogTitle>
            <DialogDescription>Automated partner integration</DialogDescription>
          </DialogHeader>
          <div className="py-6 text-center">
            <div className="text-lg font-medium text-text-heading mb-2">Coming Soon</div>
            <p className="text-text-muted">
              Our preferred partner integration feature is currently in development and will be available soon.
            </p>
          </div>
          <div className="flex justify-center">
            <Button onClick={() => setIsComingSoonModalOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
