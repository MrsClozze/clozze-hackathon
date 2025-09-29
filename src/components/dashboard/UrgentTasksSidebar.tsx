import { AlertTriangle, Clock, Calendar, Mail, MessageSquare } from "lucide-react";
import BentoCard from "./BentoCard";
import { Button } from "@/components/ui/button";

const urgentTasks = [
  {
    id: 1,
    title: "Submit Inspection Report",
    dueDate: "Today",
    property: "123 Maple Street",
    priority: "high",
    hasContact: true,
    contactName: "Home Inspector",
    daysUntilDue: 0,
  },
  {
    id: 2,
    title: "Follow up on Loan Approval",
    dueDate: "Tomorrow",
    client: "Sarah Johnson",
    priority: "high",
    hasContact: true,
    contactName: "Mortgage Broker",
    daysUntilDue: 1,
  },
  {
    id: 3,
    title: "Schedule Appraisal",
    dueDate: "Nov 30",
    property: "456 Oak Avenue",
    priority: "medium",
    hasContact: true,
    contactName: "Appraiser",
    daysUntilDue: 2,
  },
  {
    id: 4,
    title: "Prepare Listing Presentation",
    dueDate: "Dec 2",
    client: "Mike & Lisa Chen",
    priority: "medium",
    hasContact: false,
    daysUntilDue: 4,
  },
  {
    id: 5,
    title: "Review Purchase Agreement",
    dueDate: "Dec 5",
    property: "789 Pine Road",
    priority: "low",
    hasContact: true,
    contactName: "Attorney",
    daysUntilDue: 7,
  },
];

export default function UrgentTasksSidebar() {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-destructive';
      case 'medium': return 'bg-warning';
      case 'low': return 'bg-success';
      default: return 'bg-secondary';
    }
  };

  const getDueDateColor = (daysUntilDue: number) => {
    if (daysUntilDue === 0) return 'text-destructive';
    if (daysUntilDue <= 2) return 'text-warning';
    return 'text-text-muted';
  };

  return (
    <div className="w-80 flex-shrink-0">
      <BentoCard
        title="Urgent Tasks"
        subtitle="5 most urgent tasks by due date"
        className="h-full"
        elevated
      >
        <div className="space-y-4">
          {urgentTasks.map((task) => (
            <div
              key={task.id}
              className="p-4 rounded-lg bg-background-elevated border border-card-border hover:border-accent-gold/30 transition-all duration-200 group"
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
                      {task.property || task.client}
                    </p>
                  </div>
                </div>
              </div>

              {/* Due Date */}
              <div className="flex items-center gap-2 mb-3">
                <Clock className={`h-3 w-3 ${getDueDateColor(task.daysUntilDue)}`} />
                <span className={`text-xs font-medium ${getDueDateColor(task.daysUntilDue)}`}>
                  Due: {task.dueDate}
                </span>
                {task.daysUntilDue === 0 && (
                  <AlertTriangle className="h-3 w-3 text-destructive" />
                )}
              </div>

              {/* AI Assist Actions */}
              {task.hasContact && (
                <div className="space-y-2">
                  <p className="text-xs text-text-subtle">
                    Contact: {task.contactName}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1 text-xs py-1 h-7"
                    >
                      <Mail className="h-3 w-3" />
                      Email
                      <span className="text-accent-gold text-[10px]">(AI Assist)</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1 text-xs py-1 h-7"
                    >
                      <MessageSquare className="h-3 w-3" />
                      Text
                      <span className="text-accent-gold text-[10px]">(AI Assist)</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* View All Tasks Button */}
          <Button
            variant="outline"
            className="w-full mt-4 gap-2 group"
          >
            <Calendar className="h-4 w-4 group-hover:text-accent-gold transition-colors" />
            View All Tasks
          </Button>
        </div>
      </BentoCard>
    </div>
  );
}