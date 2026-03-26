import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import type { PendingAction } from '@/hooks/useEntityMemory';

interface PendingActionsWidgetProps {
  pendingActions: PendingAction[];
  completedCount: number;
}

export default function PendingActionsWidget({ pendingActions, completedCount }: PendingActionsWidgetProps) {
  if (pendingActions.length === 0 && completedCount === 0) return null;

  return (
    <div className="px-3 py-2 border-b border-border/50 bg-muted/10">
      {/* Summary bar */}
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground mb-1">
        {completedCount > 0 && (
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-primary" />
            {completedCount} done
          </span>
        )}
        {pendingActions.length > 0 && (
          <span className="flex items-center gap-1 text-destructive">
            <Clock className="h-3 w-3" />
            {pendingActions.length} pending
          </span>
        )}
      </div>

      {/* Pending items list — compact */}
      {pendingActions.length > 0 && (
        <div className="space-y-0.5">
          {pendingActions.slice(0, 3).map((action, i) => (
            <div
              key={i}
              className="flex items-start gap-1.5 text-[11px] text-foreground/80"
            >
              <AlertCircle className="h-3 w-3 text-destructive mt-0.5 flex-shrink-0" />
              <span className="line-clamp-1">
                {action.action}
                {action.details && (
                  <span className="text-muted-foreground"> — {action.details}</span>
                )}
              </span>
            </div>
          ))}
          {pendingActions.length > 3 && (
            <p className="text-[10px] text-muted-foreground pl-4">
              +{pendingActions.length - 3} more
            </p>
          )}
        </div>
      )}
    </div>
  );
}
