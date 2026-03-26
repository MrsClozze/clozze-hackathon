import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Check, X, AlertTriangle, Calendar, User, Home, Flag } from "lucide-react";

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

interface TeamMember { userId: string; name: string; }
interface Buyer { id: string; firstName: string; lastName: string; }
interface Listing { id: string; address: string; }

interface AITaskPreviewProps {
  parsed: ParsedTask;
  teamMembers: TeamMember[];
  buyers: Buyer[];
  listings: Listing[];
  onConfirm: (task: ParsedTask) => void;
  onCancel: () => void;
}

export default function AITaskPreview({ parsed, teamMembers, buyers, listings, onConfirm, onCancel }: AITaskPreviewProps) {
  const [task, setTask] = useState<ParsedTask>({ ...parsed });

  const assigneeNames = (task.assigneeUserIds || [])
    .map((id) => teamMembers.find((m) => m.userId === id)?.name)
    .filter(Boolean);

  const buyerName = task.buyerId
    ? (() => { const b = buyers.find((b) => b.id === task.buyerId); return b ? `${b.firstName} ${b.lastName}` : null; })()
    : null;

  const listingAddress = task.listingId
    ? listings.find((l) => l.id === task.listingId)?.address
    : null;

  return (
    <Card className="mb-6 border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">AI Parsed Task — Review & Confirm</CardTitle>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
            <Button size="sm" onClick={() => onConfirm(task)}>
              <Check className="h-4 w-4 mr-1" /> Create Task
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Title */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Title</label>
          <Input
            value={task.title}
            onChange={(e) => setTask((t) => ({ ...t, title: e.target.value }))}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Due Date */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Due Date
              {!task.dueDate && <AlertTriangle className="h-3 w-3 text-warning" />}
            </label>
            <Input
              type="date"
              value={task.dueDate || ""}
              onChange={(e) => setTask((t) => ({ ...t, dueDate: e.target.value || null }))}
            />
            {!task.dueDate && (
              <p className="text-xs text-warning mt-1">No due date detected — please set one.</p>
            )}
          </div>

          {/* Due Time */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Time (optional)</label>
            <Input
              type="time"
              value={task.dueTime || ""}
              onChange={(e) => setTask((t) => ({ ...t, dueTime: e.target.value || null }))}
            />
          </div>

          {/* Priority */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
              <Flag className="h-3 w-3" /> Priority
            </label>
            <Select
              value={task.priority}
              onValueChange={(v) => setTask((t) => ({ ...t, priority: v as "low" | "medium" | "high" }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Notes</label>
          <Textarea
            value={task.description || ""}
            onChange={(e) => setTask((t) => ({ ...t, description: e.target.value || null }))}
            placeholder="Optional notes..."
            rows={2}
          />
        </div>

        {/* Resolved entities */}
        <div className="flex flex-wrap gap-2">
          {assigneeNames.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              <User className="h-3 w-3" />
              Assigned to: {assigneeNames.join(", ")}
            </Badge>
          )}
          {buyerName && (
            <Badge variant="secondary" className="gap-1">
              Buyer: {buyerName}
            </Badge>
          )}
          {listingAddress && (
            <Badge variant="secondary" className="gap-1">
              <Home className="h-3 w-3" />
              Listing: {listingAddress}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
