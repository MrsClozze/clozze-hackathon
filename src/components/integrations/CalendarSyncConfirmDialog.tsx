import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTasks } from "@/contexts/TasksContext";

interface CalendarSyncConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: "google" | "apple";
  onConfirm: (syncExisting: boolean) => void;
  onCancel: () => void;
}

export function CalendarSyncConfirmDialog({
  open,
  onOpenChange,
  provider,
  onConfirm,
  onCancel,
}: CalendarSyncConfirmDialogProps) {
  const { tasks } = useTasks();
  const [existingCalendarTasks, setExistingCalendarTasks] = useState<number>(0);

  useEffect(() => {
    // Count tasks that are on dashboard calendar but NOT synced to external
    const count = tasks.filter(
      (t) => t.showOnCalendar && !t.syncToExternalCalendar
    ).length;
    setExistingCalendarTasks(count);
  }, [tasks]);

  const providerName = provider === "google" ? "Google Calendar" : "Apple Calendar";

  // If no existing calendar tasks, don't show dialog - just proceed
  useEffect(() => {
    if (open && existingCalendarTasks === 0) {
      onConfirm(false);
    }
  }, [open, existingCalendarTasks, onConfirm]);

  // Don't render dialog if no tasks to sync
  if (existingCalendarTasks === 0) {
    return null;
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Sync Existing Tasks?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              You have <strong>{existingCalendarTasks} task{existingCalendarTasks !== 1 ? "s" : ""}</strong> on 
              your dashboard calendar. You're about to connect {providerName}.
            </p>
            <p>Do you want to sync these tasks to {providerName}?</p>
            <p className="text-xs text-muted-foreground mt-4 border-t pt-3">
              <strong>Note:</strong> You can also choose to sync tasks individually later by 
              opening a task and toggling "Sync to connected calendar."
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => {
              onCancel();
              onConfirm(false);
            }}
          >
            No, Connect Without Syncing
          </AlertDialogCancel>
          <AlertDialogAction onClick={() => onConfirm(true)}>
            Yes, Sync All
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
