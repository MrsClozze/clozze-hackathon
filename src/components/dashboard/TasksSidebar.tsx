import { Plus, Clock, AlertTriangle, Info, Home, User } from "lucide-react";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTasks } from "@/contexts/TasksContext";
import { useBuyers } from "@/contexts/BuyersContext";
import { useListings } from "@/contexts/ListingsContext";
import { useAccountState } from "@/contexts/AccountStateContext";
import { useAuth } from "@/contexts/AuthContext";
import TaskDetailsModal from "./TaskDetailsModal";
import AddTaskModal from "./AddTaskModal";
import { Skeleton } from "@/components/ui/skeleton";

export default function TasksSidebar() {
  const { tasks, loading, openTaskModal } = useTasks();
  const { buyers } = useBuyers();
  const { listings } = useListings();
  const { isDemo } = useAccountState();
  const { user } = useAuth();
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);

  const getTaskSourceLabel = (task: any) => {
    if (task.buyerId) {
      const buyer = buyers.find((b: any) => b.id === task.buyerId);
      return buyer ? { type: "Buyer", name: `${buyer.firstName} ${buyer.lastName}` } : null;
    }
    if (task.listingId) {
      const listing = listings.find((l: any) => l.id === task.listingId);
      return listing ? { type: "Listing", name: listing.address } : null;
    }
    return null;
  };

  // Filter to only show tasks assigned to the current user
  const myTasks = useMemo(() => {
    if (!user) return [];
    
    return tasks.filter((task) => {
      // Skip completed tasks
      if (task.status === "completed") return false;
      
      // Check if current user is explicitly assigned via junction table
      const assigneeIds: string[] = Array.isArray(task.assigneeUserIds) ? task.assigneeUserIds : [];
      if (assigneeIds.includes(user.id)) return true;
      
      // Check legacy assignee field
      if (task.assigneeUserId === user.id) return true;
      
      // Fallback: if no assignees exist, show tasks the user owns
      const hasAnyAssignees =
        (Array.isArray(task.assigneeUserIds) && task.assigneeUserIds.length > 0) ||
        Boolean(task.assigneeUserId);
      return !hasAnyAssignees && task.userId === user.id;
    });
  }, [tasks, user]);
  
  // Sort by priority (high > medium > low) and then by date (earliest first)
  const sortedTasks = useMemo(() => {
    return [...myTasks].sort((a, b) => {
      const priorityWeight: Record<string, number> = { high: 3, medium: 2, low: 1 };
      const priorityDiff = (priorityWeight[b.priority] || 1) - (priorityWeight[a.priority] || 1);
      
      if (priorityDiff !== 0) return priorityDiff;
      
      const dateA = new Date(a.dueDate || a.date || 0);
      const dateB = new Date(b.dueDate || b.date || 0);
      return dateA.getTime() - dateB.getTime();
    });
  }, [myTasks]);
  
  // Show only top 5 most urgent tasks for the current user
  const todoTasks = sortedTasks.slice(0, 5);

  if (loading) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-text-heading">To-Do List</h2>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* To-Do List Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-text-heading">To-Do List</h2>
          {isDemo && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-accent-gold/10 border border-accent-gold/30 text-accent-gold text-[10px] font-medium">
              <Info className="h-2.5 w-2.5" />
              Demo
            </span>
          )}
        </div>
        <Button
          size="sm"
          onClick={() => setIsAddTaskOpen(true)}
          className="gap-2 relative bg-primary text-primary-foreground hover:bg-primary-hover transition-all duration-300 overflow-hidden group before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-r before:from-violet-500/20 before:via-fuchsia-500/20 before:to-cyan-500/20 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300 hover:backdrop-blur-md hover:border hover:border-white/20 hover:shadow-lg"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-400/30 via-pink-400/30 to-cyan-400/30 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-500 skew-x-12"></div>
          <Plus className="h-4 w-4 relative z-10" />
          <span className="relative z-10">Add Task</span>
        </Button>
      </div>
      
      {todoTasks.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-border rounded-lg">
          <p className="text-text-muted text-sm mb-3">No tasks yet</p>
          <button 
            onClick={() => setIsAddTaskOpen(true)}
            className="text-primary text-sm hover:underline"
          >
            Add your first task
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {todoTasks.map((task) => (
            <div
              key={task.id}
              onClick={() => openTaskModal(task)}
              className="p-4 rounded-lg bg-card border border-card-border hover:border-accent-gold/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium text-text-heading text-sm leading-tight">
                  {task.title}
                </h3>
                <div className="flex items-center gap-1 ml-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      task.priority === "high" ? "bg-destructive" : task.priority === "medium" ? "bg-warning" : "bg-muted"
                    }`}
                  />
                  {/* Only show SAMPLE badge for demo tasks */}
                  {task.isDemo && (
                    <span className="bg-accent-gold text-accent-gold-foreground px-1 py-0.5 rounded text-[10px] font-medium">
                      SAMPLE
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1 text-xs text-text-muted">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {task.dueDate || task.date}
                </div>
                {(task.address || task.listingId) && (
                  <div>
                    {task.address || (() => {
                      const listing = listings.find(l => l.id === task.listingId);
                      return listing ? `${listing.address}, ${listing.city}` : null;
                    })()}
                  </div>
                )}
                {task.assignee && <div>{task.assignee}</div>}
                {(() => {
                  const source = getTaskSourceLabel(task);
                  if (!source) return null;
                  return (
                    <div className="flex items-center gap-1 mt-1">
                      {source.type === "Buyer" ? (
                        <User className="h-3 w-3 text-primary" />
                      ) : (
                        <Home className="h-3 w-3 text-primary" />
                      )}
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                        {source.type}: {source.name}
                      </Badge>
                    </div>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>
      )}

      <AddTaskModal open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen} />
      <TaskDetailsModal />
    </div>
  );
}
