import { Plus, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  return (
    <div className="w-80 flex-shrink-0 space-y-6">
      {/* To-Do List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-text-heading">To-Do List</h2>
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Task
          </Button>
        </div>
        
        <div className="space-y-3">
          {todoTasks.map((task) => (
            <div
              key={task.id}
              className="p-4 rounded-lg bg-card border border-card-border hover:border-accent-gold/30 transition-all duration-200"
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
                <div className="mt-2 text-xs">
                  <span className="text-accent-gold">Email client with AI assist?</span>
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
    </div>
  );
}