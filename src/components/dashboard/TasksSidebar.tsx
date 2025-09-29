import { Plus, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTasks } from "@/contexts/TasksContext";
import TaskDetailsModal from "./TaskDetailsModal";

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
  const { tasks, openTaskModal } = useTasks();

  const todoTasks = tasks.filter((task) => task.status !== "completed");
  const completedTasks = tasks.filter((task) => task.status === "completed");

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
                      task.priority === "high" ? "bg-destructive" : "bg-warning"
                    }`}
                  />
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
                {task.address && <div>{task.address}</div>}
                {task.assignee && <div>{task.assignee}</div>}
              </div>
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
            {completedTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => openTaskModal(task)}
                className="p-4 rounded-lg bg-card border border-card-border hover:border-accent-gold/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer group opacity-60"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-text-heading text-sm leading-tight line-through">
                    {task.title}
                  </h3>
                </div>
                <div className="space-y-1 text-xs text-text-muted">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {task.date}
                  </div>
                </div>
              </div>
            ))}
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

      <TaskDetailsModal />
    </div>
  );
}
