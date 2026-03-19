import { AlertTriangle, Clock, Calendar } from "lucide-react";
import BentoCard from "./BentoCard";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";
import { useTasks } from "@/contexts/TasksContext";
import { useListings } from "@/contexts/ListingsContext";
import { useNavigate } from "react-router-dom";
import { differenceInDays, parse } from "date-fns";
import TaskDetailsModal from "./TaskDetailsModal";

export default function UrgentTasksSidebar() {
  const { tasks, openTaskModal } = useTasks();
  const { listings } = useListings();
  const navigate = useNavigate();

  // Get the 5 most urgent tasks sorted by due date
  const urgentTasks = useMemo(() => {
    const today = new Date();
    
    return tasks
      .filter(task => task.status !== "completed")
      .map(task => {
        const taskDate = parse(task.date, "MMM dd, yyyy", new Date());
        const daysUntilDue = differenceInDays(taskDate, today);
        return { ...task, daysUntilDue };
      })
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue)
      .slice(0, 5);
  }, [tasks]);

  const getPriorityColor = (priority: "high" | "medium" | "low") => {
    switch (priority) {
      case 'high': return 'bg-destructive';
      case 'medium': return 'bg-warning';
      case 'low': return 'bg-success';
      default: return 'bg-secondary';
    }
  };

  const getDueDateColor = (daysUntilDue: number) => {
    if (daysUntilDue <= 0) return 'text-destructive';
    if (daysUntilDue <= 2) return 'text-warning';
    return 'text-text-muted';
  };

  const formatDueDate = (daysUntilDue: number, date: string) => {
    if (daysUntilDue === 0) return "Today";
    if (daysUntilDue === 1) return "Tomorrow";
    return date;
  };

  return (
    <>
      <div className="w-80 flex-shrink-0">
        <BentoCard
          title="Urgent Tasks"
          subtitle="5 most urgent tasks by due date"
          className="h-full"
          elevated
        >
          <div className="space-y-4">
            {urgentTasks.length > 0 ? (
              urgentTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4 rounded-lg bg-background-elevated border border-card-border hover:border-accent-gold/30 transition-all duration-200 group cursor-pointer"
                  onClick={() => openTaskModal(task)}
                >
                  {/* Task Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-2">
                      <div className={`w-2 h-2 rounded-full mt-2 ${getPriorityColor(task.priority)}`} />
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-text-heading group-hover:text-accent-gold transition-colors leading-tight">
                          {task.title}
                        </h4>
                        <p className="text-xs text-text-muted mt-1">
                          {task.address || (() => {
                            if (task.listingId) {
                              const listing = listings.find(l => l.id === task.listingId);
                              if (listing) return `${listing.address}, ${listing.city}`;
                            }
                            return "No address";
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Due Date */}
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className={`h-3 w-3 ${getDueDateColor(task.daysUntilDue)}`} />
                    <span className={`text-xs font-medium ${getDueDateColor(task.daysUntilDue)}`}>
                      Due: {formatDueDate(task.daysUntilDue, task.date)}
                    </span>
                    {task.daysUntilDue <= 0 && (
                      <AlertTriangle className="h-3 w-3 text-destructive" />
                    )}
                  </div>

                  {/* Assignee */}
                  {task.assignee && (
                    <p className="text-xs text-text-subtle">
                      Assigned: {task.assignee}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-text-muted text-sm">
                No urgent tasks at the moment
              </div>
            )}

            {/* View All Tasks Button */}
            <Button
              variant="outline"
              className="w-full mt-4 gap-2 group"
              onClick={() => navigate("/tasks")}
            >
              <Calendar className="h-4 w-4 group-hover:text-accent-gold transition-colors" />
              View All Tasks
            </Button>
          </div>
        </BentoCard>
      </div>
      
      <TaskDetailsModal />
    </>
  );
}