import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Calendar, CheckSquare, Trash2 } from "lucide-react";

interface CalendarEventDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventTitle: string;
  isTaskEvent: boolean;
  onDeleteEventOnly: () => void;
  onRemoveFromCalendarOnly: () => void;
  onDeleteBoth: () => void;
}

export function CalendarEventDeleteDialog({
  open,
  onOpenChange,
  eventTitle,
  isTaskEvent,
  onDeleteEventOnly,
  onRemoveFromCalendarOnly,
  onDeleteBoth,
}: CalendarEventDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Delete "{eventTitle}"?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isTaskEvent 
              ? "This calendar event is linked to a task. Choose what you'd like to delete:"
              : "Are you sure you want to delete this event?"}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 mt-4">
          {isTaskEvent ? (
            <>
              {/* Option 1: Remove from calendar only */}
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-auto py-3"
                onClick={() => {
                  onRemoveFromCalendarOnly();
                  onOpenChange(false);
                }}
              >
                <Calendar className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <div className="font-medium">Remove from calendar only</div>
                  <div className="text-xs text-muted-foreground">
                    Keep the task but remove it from the calendar view
                  </div>
                </div>
              </Button>

              {/* Option 2: Delete task and event */}
              <Button
                variant="destructive"
                className="w-full justify-start gap-3 h-auto py-3"
                onClick={() => {
                  onDeleteBoth();
                  onOpenChange(false);
                }}
              >
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>+</span>
                  <CheckSquare className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Delete task and calendar event</div>
                  <div className="text-xs opacity-80">
                    Permanently remove both the task and calendar event
                  </div>
                </div>
              </Button>

              {/* Cancel */}
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
            </>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => {
                  onDeleteEventOnly();
                  onOpenChange(false);
                }}
              >
                Delete Event
              </Button>
            </div>
          )}
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
