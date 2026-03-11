import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTasks } from "@/contexts/TasksContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle2, ChevronDown, ChevronRight, ListChecks, Plus, Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SuggestedTask {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  due_date: string | null;
  status: string;
  accepted_task_id: string | null;
}

interface TransactionSuggestedTasksProps {
  recordType: "buyer" | "listing";
  recordId: string;
  refreshKey?: number;
}

export default function TransactionSuggestedTasks({ recordType, recordId, refreshKey }: TransactionSuggestedTasksProps) {
  const { user } = useAuth();
  const { addTask, refetchTasks } = useTasks();
  const { toast } = useToast();
  const [suggestedTasks, setSuggestedTasks] = useState<SuggestedTask[]>([]);
  const [isOpen, setIsOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [acceptingIds, setAcceptingIds] = useState<Set<string>>(new Set());
  const [acceptingAll, setAcceptingAll] = useState(false);

  const fetchSuggestedTasks = async () => {
    if (!user || !recordId) return;

    const column = recordType === "listing" ? "listing_id" : "buyer_id";

    // First get the transaction for this record
    const { data: txn } = await supabase
      .from("transactions")
      .select("id")
      .eq(column, recordId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!txn) {
      setSuggestedTasks([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("transaction_suggested_tasks")
      .select("id, title, description, priority, due_date, status, accepted_task_id")
      .eq("transaction_id", txn.id)
      .order("due_date", { ascending: true, nullsFirst: false });

    if (error) {
      console.error("Error fetching suggested tasks:", error);
    } else {
      setSuggestedTasks(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSuggestedTasks();
  }, [user, recordId, recordType]);

  const acceptTask = async (suggested: SuggestedTask) => {
    if (!user) return;

    setAcceptingIds(prev => new Set(prev).add(suggested.id));
    try {
      await addTask({
        title: suggested.title,
        notes: suggested.description || "",
        dueDate: suggested.due_date || "",
        priority: suggested.priority as "low" | "medium" | "high",
        status: "pending",
        ...(recordType === "buyer" ? { buyerId: recordId } : { listingId: recordId }),
        address: "",
        assignee: "",
        date: "",
        hasAIAssist: false,
        showOnCalendar: true,
        syncToExternalCalendar: false,
        includeWeekends: true,
      }, { silent: true });

      // Mark suggested task as accepted
      await supabase
        .from("transaction_suggested_tasks")
        .update({ status: "accepted" })
        .eq("id", suggested.id);

      setSuggestedTasks(prev =>
        prev.map(t => t.id === suggested.id ? { ...t, status: "accepted" } : t)
      );

      toast({ title: "Task added", description: `"${suggested.title}" has been added to your tasks.` });
    } catch (err) {
      console.error("Error accepting task:", err);
      toast({ title: "Error", description: "Failed to add task.", variant: "destructive" });
    } finally {
      setAcceptingIds(prev => { const n = new Set(prev); n.delete(suggested.id); return n; });
    }
  };

  const acceptAllTasks = async () => {
    const pending = suggestedTasks.filter(t => t.status === "proposed");
    if (pending.length === 0) return;

    setAcceptingAll(true);
    try {
      for (const task of pending) {
        await acceptTask(task);
      }
      await refetchTasks();
      toast({ title: "All tasks added", description: `${pending.length} tasks have been added to your task list.` });
    } finally {
      setAcceptingAll(false);
    }
  };

  if (loading || suggestedTasks.length === 0) return null;

  const proposedTasks = suggestedTasks.filter(t => t.status === "proposed");
  const acceptedTasks = suggestedTasks.filter(t => t.status === "accepted");

  return (
    <div className="space-y-3">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20 hover:bg-primary/15 transition-all cursor-pointer">
            <ListChecks className="h-5 w-5 text-primary" />
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-primary" />
            ) : (
              <ChevronRight className="h-4 w-4 text-primary" />
            )}
            <span className="font-semibold text-primary uppercase tracking-wide text-sm">
              Suggested Tasks ({proposedTasks.length} pending)
            </span>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-2">
          {proposedTasks.length > 1 && (
            <div className="flex justify-end mb-2">
              <Button
                size="sm"
                variant="outline"
                onClick={acceptAllTasks}
                disabled={acceptingAll}
                className="text-xs gap-1.5"
              >
                {acceptingAll ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                Add All Tasks
              </Button>
            </div>
          )}

          {proposedTasks.map(task => (
            <div
              key={task.id}
              className="flex items-center justify-between p-3 bg-primary/5 rounded-md border border-primary/15 hover:border-primary/30 transition-all"
            >
              <div className="flex-1 min-w-0 mr-3">
                <p className="font-medium text-sm">{task.title}</p>
                {task.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs capitalize">{task.priority}</Badge>
                  {task.due_date && (
                    <span className="text-xs text-muted-foreground">
                      Due: {new Date(task.due_date + 'T00:00:00').toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => acceptTask(task)}
                disabled={acceptingIds.has(task.id)}
                className="text-primary hover:text-primary hover:bg-primary/10 gap-1 flex-shrink-0"
              >
                {acceptingIds.has(task.id) ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Add
              </Button>
            </div>
          ))}

          {acceptedTasks.length > 0 && (
            <div className="mt-3 pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2 font-medium">Already added</p>
              {acceptedTasks.map(task => (
                <div
                  key={task.id}
                  className="flex items-center gap-2 p-2 rounded-md opacity-60"
                >
                  <Check className="h-4 w-4 text-success flex-shrink-0" />
                  <span className="text-sm">{task.title}</span>
                </div>
              ))}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
