import { Plus, Clock, AlertTriangle, Mail, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const todoTasks = [
  {
    id: 1,
    title: "Schedule Property Viewing",
    date: "Dec 15, 2024",
    address: "123 Elm Street",
    assignee: "Sarah Johnson",
    hasAIAssist: true,
    priority: "high",
  },
  {
    id: 2,
    title: "Prepare Contract",
    date: "Dec 18, 2024",
    address: "456 Oak Avenue",
    assignee: "Michael Brown",
    hasAIAssist: false,
    priority: "high",
  },
  {
    id: 3,
    title: "Schedule Property Inspector",
    date: "Dec 20, 2024",
    address: "456 Oak Avenue",
    assignee: "ABC Inspections",
    hasAIAssist: true,
    priority: "medium",
  },
  {
    id: 4,
    title: "Review Documents",
    date: "Dec 22, 2024",
    address: "789 Pine Lane",
    assignee: "Emily Davis",
    hasAIAssist: false,
    priority: "medium",
  },
];

const completedTasks = [];

const urgentTasks = [
  {
    id: 1,
    title: "Finalize contract for 456 Oak Avenue",
    priority: "high",
    icon: AlertTriangle,
  },
  {
    id: 2,
    title: "Confirm viewing for 123 Elm Street",
    priority: "medium",
    icon: Clock,
  },
];

export default function TasksSidebar() {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isTaskDetailsModalOpen, setIsTaskDetailsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<typeof todoTasks[0] | null>(null);

  const handleContactClick = (task: typeof todoTasks[0], e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTask(task);
    setIsContactModalOpen(true);
  };

  const handleTaskClick = (task: typeof todoTasks[0]) => {
    setSelectedTask(task);
    setIsTaskDetailsModalOpen(true);
  };

  return (
    <div className="w-80 flex-shrink-0 space-y-6">
      {/* To-Do List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-text-heading">To-Do List</h2>
          <Button size="sm" className="gap-2 relative bg-primary text-primary-foreground hover:bg-primary-hover transition-all duration-300 overflow-hidden group before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-r before:from-violet-500/20 before:via-fuchsia-500/20 before:to-cyan-500/20 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300 hover:backdrop-blur-md hover:border hover:border-white/20 hover:shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-400/30 via-pink-400/30 to-cyan-400/30 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-500 skew-x-12"></div>
            <Plus className="h-4 w-4 relative z-10" />
            <span className="relative z-10">Add Task</span>
          </Button>
        </div>
        
        <div className="space-y-3">
          {todoTasks.map((task) => (
            <div
              key={task.id}
              onClick={() => handleTaskClick(task)}
              className="p-4 rounded-lg bg-card border border-card-border hover:border-accent-gold/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium text-text-heading text-sm leading-tight">
                  {task.title}
                </h3>
                <div className="flex items-center gap-1 ml-2">
                  <div className={`w-2 h-2 rounded-full ${
                    task.priority === 'high' ? 'bg-destructive' : 'bg-warning'
                  }`} />
                  <span className="bg-accent-gold text-accent-gold-foreground px-1 py-0.5 rounded text-[10px] font-medium">
                    EXAMPLE
                  </span>
                </div>
              </div>
              
              <div className="space-y-1 text-xs text-text-muted">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {task.date}
                </div>
                <div>{task.address}</div>
                <div>{task.assignee}</div>
              </div>
              
              {task.hasAIAssist && (
                <div className="mt-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-6 px-2 text-xs text-accent-gold border-accent-gold hover:bg-accent-gold hover:text-accent-gold-foreground"
                    onClick={(e) => handleContactClick(task, e)}
                  >
                    <Mail className="h-3 w-3" />
                    <MessageSquare className="h-3 w-3" />
                    Email or Text with AI Assist
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Completed Tasks */}
      <div>
        <h2 className="text-xl font-semibold text-text-heading mb-4">Completed Tasks</h2>
        
        {completedTasks.length === 0 ? (
          <div className="text-center py-8 text-text-muted">
            <p className="text-sm">No completed tasks yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Completed tasks would be rendered here */}
          </div>
        )}
      </div>

      {/* Urgent Tasks */}
      <div>
        <h2 className="text-xl font-semibold text-text-heading mb-4">Urgent Tasks</h2>
        
        <div className="space-y-3">
          {urgentTasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-card border border-card-border hover:border-accent-gold/30 transition-all duration-200"
            >
              <task.icon className={`h-4 w-4 ${
                task.priority === 'high' ? 'text-destructive' : 'text-warning'
              }`} />
              <span className="text-sm text-text-heading flex-1">
                {task.title}
              </span>
              <div className={`w-2 h-2 rounded-full ${
                task.priority === 'high' ? 'bg-destructive' : 'bg-warning'
              }`} />
            </div>
          ))}
        </div>
      </div>

      {/* Task Details Modal */}
      <Dialog open={isTaskDetailsModalOpen} onOpenChange={setIsTaskDetailsModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">{selectedTask?.title}</DialogTitle>
            <DialogDescription>
              Complete task details and information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-text-muted mb-1">Date</div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-accent-gold" />
                  {selectedTask?.date}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-text-muted mb-1">Priority</div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    selectedTask?.priority === 'high' ? 'bg-destructive' : 'bg-warning'
                  }`} />
                  <span className="text-sm capitalize">{selectedTask?.priority}</span>
                </div>
              </div>
            </div>
            
            <div>
              <div className="text-sm font-medium text-text-muted mb-1">Address</div>
              <div className="text-sm">{selectedTask?.address}</div>
            </div>
            
            <div>
              <div className="text-sm font-medium text-text-muted mb-1">Assigned To</div>
              <div className="text-sm">{selectedTask?.assignee}</div>
            </div>

            {selectedTask?.hasAIAssist && (
              <div className="pt-4 border-t border-border">
                <div className="text-sm font-medium text-text-muted mb-3">AI Assistance Available</div>
                <Button 
                  size="sm" 
                  className="w-full bg-accent-gold text-accent-gold-foreground hover:bg-accent-gold/90"
                  onClick={(e) => {
                    setIsTaskDetailsModalOpen(false);
                    handleContactClick(selectedTask, e);
                  }}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  <MessageSquare className="h-4 w-4 mr-2" />
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
            <DialogDescription>
              Choose how you'd like to contact {selectedTask?.assignee} about "{selectedTask?.title}"
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            <Button
              variant="outline"
              className="h-20 flex-col gap-2 hover:bg-accent-gold/5 hover:border-accent-gold/30"
            >
              <Mail className="h-6 w-6" />
              <div className="text-center">
                <div className="font-medium">Send Email</div>
                <div className="text-xs text-text-muted">AI will draft an email for you</div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col gap-2 hover:bg-accent-gold/5 hover:border-accent-gold/30"
            >
              <MessageSquare className="h-6 w-6" />
              <div className="text-center">
                <div className="font-medium">Send Text Message</div>
                <div className="text-xs text-text-muted">AI will draft a text for you</div>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}