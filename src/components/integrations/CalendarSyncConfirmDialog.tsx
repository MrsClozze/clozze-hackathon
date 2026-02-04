import { useState, useEffect, useRef } from "react";
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
  const { tasks, refetchTasks } = useTasks();
  const [existingCalendarTasks, setExistingCalendarTasks] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const hasRefetched = useRef(false);
  const hasAutoConfirmed = useRef(false);

  // Refetch tasks when dialog opens to get fresh data
  useEffect(() => {
    if (open && !hasRefetched.current) {
      hasRefetched.current = true;
      hasAutoConfirmed.current = false;
      setIsLoading(true);
      setExistingCalendarTasks(null); // Reset to unknown state
      refetchTasks().finally(() => {
        setIsLoading(false);
      });
    }
    
    // Reset refs when dialog closes
    if (!open) {
      hasRefetched.current = false;
      hasAutoConfirmed.current = false;
      setExistingCalendarTasks(null);
    }
  }, [open, refetchTasks]);

  // Count tasks after data is loaded (only when not loading)
  useEffect(() => {
    if (open && !isLoading && existingCalendarTasks === null) {
      const count = tasks.filter(
        (t) => t.showOnCalendar && !t.syncToExternalCalendar && !t.isDemo
      ).length;
      setExistingCalendarTasks(count);
    }
  }, [open, tasks, isLoading, existingCalendarTasks]);

  const providerName = provider === "google" ? "Google Calendar" : "Apple Calendar";

  // If no existing calendar tasks after counting is complete, auto-confirm without showing dialog
  useEffect(() => {
    if (open && existingCalendarTasks === 0 && !hasAutoConfirmed.current) {
      hasAutoConfirmed.current = true;
      onConfirm(false);
    }
  }, [open, existingCalendarTasks, onConfirm]);

  // Don't render dialog while loading or if count hasn't been determined yet
  // Also don't render if count is 0 (we auto-confirmed above)
  if (isLoading || existingCalendarTasks === null || existingCalendarTasks === 0) {
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
