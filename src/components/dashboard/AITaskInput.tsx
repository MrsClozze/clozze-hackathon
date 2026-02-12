import { useState } from "react";
import { Sparkles, Send, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTasks } from "@/contexts/TasksContext";
import AITaskPreview from "./AITaskPreview";

interface TeamMember {
  userId: string;
  name: string;
}

interface Buyer {
  id: string;
  firstName: string;
  lastName: string;
}

interface Listing {
  id: string;
  address: string;
}

interface ParsedTask {
  title: string;
  description?: string | null;
  dueDate?: string | null;
  startDate?: string | null;
  dueTime?: string | null;
  priority: "low" | "medium" | "high";
  assigneeUserIds?: string[];
  buyerId?: string | null;
  listingId?: string | null;
}

interface AITaskInputProps {
  teamMembers: TeamMember[];
  buyers: Buyer[];
  listings: Listing[];
}

export default function AITaskInput({ teamMembers, buyers, listings }: AITaskInputProps) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsedTask, setParsedTask] = useState<ParsedTask | null>(null);
  const { toast } = useToast();
  const { addTask } = useTasks();

  const handleSubmit = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("parse-task-input", {
        body: {
          input: text,
          teamMembers: teamMembers.map((m) => ({ id: m.userId, name: m.name })),
          buyers: buyers.map((b) => ({ id: b.id, firstName: b.firstName, lastName: b.lastName })),
          listings: listings.map((l) => ({ id: l.id, address: l.address })),
          todayDate: new Date().toISOString().split("T")[0],
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });

      if (error) throw error;

      if (data?.error) {
        toast({ title: "AI Error", description: data.error, variant: "destructive" });
        return;
      }

      if (data?.parsed) {
        setParsedTask(data.parsed);
      }
    } catch (err: any) {
      console.error("AI parse error:", err);
      const status = err?.status || err?.context?.status;
      if (status === 429) {
        toast({ title: "Rate Limited", description: "Too many requests. Please wait a moment.", variant: "destructive" });
      } else if (status === 402) {
        toast({ title: "Credits Exhausted", description: "Please add AI credits to continue.", variant: "destructive" });
      } else {
        toast({ title: "Error", description: "Failed to parse your input. Please try again.", variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (task: ParsedTask) => {
    try {
      await addTask({
        title: task.title,
        notes: task.description || "",
        dueDate: task.dueDate || undefined,
        startDate: task.startDate || undefined,
        dueTime: task.dueTime || undefined,
        priority: task.priority,
        assigneeUserIds: task.assigneeUserIds || [],
        buyerId: task.buyerId || undefined,
        listingId: task.listingId || undefined,
        date: "",
        address: "",
        assignee: "",
        hasAIAssist: true,
        status: "pending",
      });

      setParsedTask(null);
      setInput("");
      toast({ title: "Task Created", description: `"${task.title}" has been created.` });
    } catch (err) {
      console.error("Task creation error:", err);
      toast({ title: "Error", description: "Failed to create task.", variant: "destructive" });
    }
  };

  const handleCancel = () => {
    setParsedTask(null);
  };

  if (parsedTask) {
    return (
      <AITaskPreview
        parsed={parsedTask}
        teamMembers={teamMembers}
        buyers={buyers}
        listings={listings}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <Card className="mb-6 border-primary/20 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary">AI Task Creator</span>
          <Badge variant="outline" className="text-xs">Beta</Badge>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder='Try: "Create a task for John to send the inspection report by Friday"'
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            disabled={loading}
            className="flex-1"
          />
          <Button onClick={handleSubmit} disabled={!input.trim() || loading} size="icon">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
