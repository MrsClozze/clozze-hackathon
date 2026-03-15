import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "./AuthContext";
import { useAccountState } from "./AccountStateContext";
import { DEMO_TASKS, isDemoId } from "@/data/demoData";
import { phCreateTask, phCompleteTask } from "@/lib/posthog";

// Helper to get browser timezone
const getBrowserTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

const formatLegacyTaskDate = (value?: string | null) => {
  if (!value) return "";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const parseLegacyTaskDate = (value?: string | null) => {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export interface TaskAssignee {
  userId: string;
  name?: string;
  assignedAt?: string;
}

export interface CalendarSyncTargets {
  mode: "mine" | "all" | "selected";
  userIds?: string[];
}

export interface Task {
  id: string;
  title: string;
  date: string;
  address: string;
  assignee: string;
  hasAIAssist: boolean;
  priority: "high" | "medium" | "low";
  notes: string;
  status?: "pending" | "in-progress" | "completed";
  startDate?: string;
  dueDate?: string;
  dueTime?: string;
  endTime?: string;
  buyerId?: string;
  listingId?: string;
  userId?: string;
  contactId?: string;
  assigneeUserId?: string;
  assigneeUserIds?: string[];
  assignees?: TaskAssignee[];
  showOnCalendar?: boolean;
  syncToExternalCalendar?: boolean;
  externalCalendarEventId?: string;
  calendarSyncTargets?: CalendarSyncTargets;
  recurrencePattern?: string;
  recurrenceEndDate?: string;
  parentTaskId?: string;
  recurrenceIndex?: number;
  includeWeekends?: boolean;
  isDemo?: boolean;
}

interface TasksContextType {
  tasks: Task[];
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  addTask: (task: Omit<Task, 'id'>, options?: { silent?: boolean }) => Promise<void>;
  addTaskAssignees: (taskId: string, userIds: string[]) => Promise<void>;
  removeTaskAssignee: (taskId: string, userId: string) => Promise<void>;
  bulkEnableExternalSync: () => Promise<void>;
  selectedTask: Task | null;
  setSelectedTask: (task: Task | null) => void;
  isTaskDetailsModalOpen: boolean;
  setIsTaskDetailsModalOpen: (open: boolean) => void;
  openTaskModal: (task: Task) => void;
  loading: boolean;
  refetchTasks: () => Promise<void>;
}

const TasksContext = createContext<TasksContextType | undefined>(undefined);

export function TasksProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { isDemo, isLoading: accountStateLoading } = useAccountState();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskDetailsModalOpen, setIsTaskDetailsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTasks = useCallback(async () => {
    // Wait for account state to be determined before fetching
    if (accountStateLoading) {
      return;
    }

    // If no user, show demo tasks
    if (!user) {
      setTasks(DEMO_TASKS.map(t => ({ ...t, isDemo: true })));
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Fetch tasks + assignees in one query (reduces latency vs a second roundtrip)
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          task_assignees (
            user_id
          )
        `)
        .order('due_date', { ascending: true });

      if (tasksError) throw tasksError;

      const mappedTasks: Task[] = (tasksData || []).map((task: any) => {
        const normalizedDueDate = task.due_date
          ? new Date(task.due_date).toISOString().split('T')[0]
          : parseLegacyTaskDate(task.date);

        return {
          id: task.id,
          title: task.title,
          date: task.date || formatLegacyTaskDate(normalizedDueDate),
          address: task.address || '',
          assignee: task.assignee || '',
          hasAIAssist: task.has_ai_assist,
          priority: task.priority as "high" | "medium" | "low",
          notes: task.notes || '',
          status: task.status as "pending" | "in-progress" | "completed",
          startDate: task.start_date ? new Date(task.start_date).toISOString().split('T')[0] : undefined,
          dueDate: normalizedDueDate,
          dueTime: task.due_time ? task.due_time.substring(0, 5) : undefined,
          endTime: task.end_time ? task.end_time.substring(0, 5) : undefined,
          buyerId: task.buyer_id || undefined,
          listingId: task.listing_id || undefined,
          userId: task.user_id,
          contactId: task.contact_id || undefined,
          assigneeUserId: task.assignee_user_id || undefined,
          assigneeUserIds: (task.task_assignees || []).map((a: any) => a.user_id).filter(Boolean),
          showOnCalendar: task.show_on_calendar || false,
          syncToExternalCalendar: task.sync_to_external_calendar || false,
          externalCalendarEventId: task.external_calendar_event_id || undefined,
          calendarSyncTargets: task.calendar_sync_targets ? (typeof task.calendar_sync_targets === 'string' ? JSON.parse(task.calendar_sync_targets) : task.calendar_sync_targets) : undefined,
          recurrencePattern: task.recurrence_pattern || undefined,
          recurrenceEndDate: task.recurrence_end_date || undefined,
          parentTaskId: task.parent_task_id || undefined,
          recurrenceIndex: task.recurrence_index ?? undefined,
          includeWeekends: task.include_weekends ?? undefined,
          isDemo: false,
        };
      });

      // If user has real tasks, show only real tasks
      // If no real tasks and in demo mode, show demo tasks
      if (mappedTasks.length > 0) {
        setTasks(mappedTasks);
      } else if (isDemo) {
        // No real tasks, still in demo mode - show demo tasks
        setTasks(DEMO_TASKS.map(t => ({ ...t, isDemo: true })));
      } else {
        // No real tasks, but in live mode - show empty
        setTasks([]);
      }
    } catch (error: any) {
      console.error('Error fetching tasks:', error);
      // On error, fall back to demo tasks if in demo mode
      if (isDemo) {
        setTasks(DEMO_TASKS.map(t => ({ ...t, isDemo: true })));
      } else {
        setTasks([]);
      }
    } finally {
      setLoading(false);
    }
  }, [user, isDemo, accountStateLoading]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    // Demo tasks are read-only
    if (isDemoId(taskId)) {
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === taskId ? { ...task, ...updates } : task
        )
      );
      if (selectedTask?.id === taskId) {
        setSelectedTask((prev) => (prev ? { ...prev, ...updates } : null));
      }
      toast({
        title: "Demo Mode",
        description: "Changes to demo tasks won't be saved. Add your first listing or buyer to go live!",
      });
      return;
    }

    try {
      const dbUpdates: any = {
        title: updates.title,
        date: updates.date !== undefined
          ? updates.date
          : updates.dueDate !== undefined
            ? (updates.dueDate ? formatLegacyTaskDate(updates.dueDate) : null)
            : undefined,
        address: updates.address,
        assignee: updates.assignee,
        has_ai_assist: updates.hasAIAssist,
        priority: updates.priority,
        notes: updates.notes,
        status: updates.status,
        start_date: updates.startDate !== undefined ? (updates.startDate ? new Date(updates.startDate).toISOString() : null) : undefined,
        due_date: updates.dueDate !== undefined ? (updates.dueDate ? new Date(updates.dueDate).toISOString() : null) : undefined,
        due_time: updates.dueTime !== undefined ? (updates.dueTime || null) : undefined,
        end_time: updates.endTime !== undefined ? (updates.endTime || null) : undefined,
        buyer_id: updates.buyerId || null,
        listing_id: updates.listingId || null,
        contact_id: updates.contactId || null,
        assignee_user_id: updates.assigneeUserId || null,
        show_on_calendar: updates.showOnCalendar,
        sync_to_external_calendar: updates.syncToExternalCalendar,
        calendar_sync_targets: updates.calendarSyncTargets !== undefined 
          ? (updates.calendarSyncTargets ? JSON.stringify(updates.calendarSyncTargets) : null) 
          : undefined,
      };

      // Remove undefined values
      Object.keys(dbUpdates).forEach(key => 
        dbUpdates[key] === undefined && delete dbUpdates[key]
      );

      const { error } = await supabase
        .from('tasks')
        .update(dbUpdates)
        .eq('id', taskId);

      if (error) throw error;

      // Sync to connected calendars if sync is enabled (either just enabled or already on and task updated)
      const currentTaskForSync = tasks.find(t => t.id === taskId);
      const shouldSync = updates.syncToExternalCalendar === true || 
        (updates.syncToExternalCalendar === undefined && currentTaskForSync?.syncToExternalCalendar);
      
      if (shouldSync) {
        const dueDate = updates.dueDate || currentTaskForSync?.dueDate;
        if (dueDate) {
          const taskPayload = {
            id: taskId,
            title: updates.title || currentTaskForSync?.title || '',
            notes: updates.notes ?? currentTaskForSync?.notes,
            dueDate,
            dueTime: updates.dueTime ?? currentTaskForSync?.dueTime,
            endTime: updates.endTime ?? currentTaskForSync?.endTime,
            address: updates.address ?? currentTaskForSync?.address,
            timezone: getBrowserTimezone(),
          };

          // IMPORTANT: Do not let Apple sync latency block Google sync.
          await supabase.functions.invoke('sync-google-calendar', {
            body: { action: 'sync_task', task: taskPayload },
          });

          const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T> =>
            new Promise((resolve, reject) => {
              const t = setTimeout(() => reject(new Error(`timeout_${ms}ms`)), ms);
              p.then((v) => {
                clearTimeout(t);
                resolve(v);
              }).catch((e) => {
                clearTimeout(t);
                reject(e);
              });
            });

          void withTimeout(
            supabase.functions.invoke('sync-apple-calendar', {
              body: { action: 'sync_task', task: taskPayload },
            }),
            6000
          ).catch((err) => {
            console.warn('[TasksContext] Apple calendar sync failed (non-blocking):', err);
          });
        }
      }

      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === taskId ? { ...task, ...updates, isDemo: false } : task
        )
      );

      if (selectedTask?.id === taskId) {
        setSelectedTask((prev) => (prev ? { ...prev, ...updates, isDemo: false } : null));
      }

      await fetchTasks();

      // If marking a recurring task as completed, trigger generation of next instances
      const currentTask = tasks.find(t => t.id === taskId);
      if (updates.status === 'completed' && currentTask?.parentTaskId) {
        phCompleteTask();
        void supabase.functions.invoke('generate-recurring-tasks', {
          body: { parentTaskId: currentTask.parentTaskId, userId: user?.id },
        }).then(() => fetchTasks()).catch((err) => {
          console.warn('[TasksContext] Recurrence generation on completion failed:', err);
        });
      }

      toast({
        title: "Success",
        description: "Task updated successfully.",
      });
    } catch (error: any) {
      console.error('Error updating task:', error);
      toast({
        title: "Error",
        description: "Failed to update task. Please try again.",
        variant: "destructive",
      });
    }
  };

  const deleteTask = async (taskId: string) => {
    if (isDemoId(taskId)) {
      toast({
        title: "Demo Mode",
        description: "Demo tasks cannot be deleted. Add your first listing or buyer to go live!",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      setTasks((prevTasks) => prevTasks.filter((task) => task.id !== taskId));
      
      if (selectedTask?.id === taskId) {
        setSelectedTask(null);
        setIsTaskDetailsModalOpen(false);
      }

      toast({
        title: "Success",
        description: "Task deleted successfully.",
      });
    } catch (error: any) {
      console.error('Error deleting task:', error);
      toast({
        title: "Error",
        description: "Failed to delete task. Please try again.",
        variant: "destructive",
      });
    }
  };

  const addTask = async (task: Omit<Task, 'id'>, options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (!user) {
      if (!silent) {
        toast({
          title: "Error",
          description: "You must be logged in to add a task.",
          variant: "destructive",
        });
      }
      return;
    }

    // Validate required fields
    if (!task.title?.trim()) {
      if (!silent) {
        toast({
          title: "Error",
          description: "Task title is required.",
          variant: "destructive",
        });
      }
      return;
    }

    try {
      // Build task object, ensuring all values are properly typed
      const newTask = {
        user_id: user.id,
        title: task.title.trim(),
        date: task.date || (task.dueDate ? formatLegacyTaskDate(task.dueDate) : null),
        address: task.address || null,
        assignee: task.assignee || null,
        has_ai_assist: task.hasAIAssist ?? false,
        priority: task.priority || 'medium',
        notes: task.notes || null,
        status: task.status || 'pending',
        start_date: task.startDate ? new Date(task.startDate).toISOString() : null,
        due_date: task.dueDate ? new Date(task.dueDate).toISOString() : null,
        due_time: task.dueTime || null,
        end_time: task.endTime || null,
        buyer_id: task.buyerId || null,
        listing_id: task.listingId || null,
        contact_id: task.contactId || null,
        assignee_user_id: task.assigneeUserId || null,
        show_on_calendar: task.showOnCalendar ?? true,
        sync_to_external_calendar: task.syncToExternalCalendar ?? false,
        calendar_sync_targets: task.calendarSyncTargets ? JSON.stringify(task.calendarSyncTargets) : null,
        recurrence_pattern: task.recurrencePattern || null,
        recurrence_end_date: task.recurrenceEndDate || null,
        include_weekends: task.recurrencePattern === 'daily' ? (task.includeWeekends ?? false) : true,
      };

      console.log('[TasksContext] Creating task:', newTask);

      const { data, error } = await supabase
        .from('tasks')
        .insert(newTask)
        .select()
        .single();

      if (error) {
        console.error('[TasksContext] Supabase error:', error);
        throw error;
      }

      console.log('[TasksContext] Task created:', data.id);
      phCreateTask();

      // Insert multiple assignees into task_assignees table
      const assigneeIds = task.assigneeUserIds?.filter(Boolean) || 
        (task.assigneeUserId ? [task.assigneeUserId] : []);
      
      if (assigneeIds.length > 0) {
        const assigneesInsert = assigneeIds.map(userId => ({
          task_id: data.id,
          user_id: userId,
          assigned_by: user.id,
        }));

        console.log('[TasksContext] Adding assignees:', assigneesInsert);

        const { error: assigneeError } = await supabase
          .from('task_assignees')
          .insert(assigneesInsert);

        if (assigneeError) {
          console.error('[TasksContext] Assignee insert error:', assigneeError);
          // Don't throw - task was created, just assignees failed
        }
      }

      // Note: Tasks with showOnCalendar=true appear on the Clozze Task Calendar
      // directly from the tasks table. We do NOT insert into calendar_events here.
      // calendar_events is reserved for external/connected calendar events only.

      // If syncToExternalCalendar is true, sync to connected calendars
      if (task.syncToExternalCalendar && task.dueDate) {
        console.log('[TasksContext] Syncing task to connected calendars:', {
          taskId: data.id,
          title: task.title,
          dueDate: task.dueDate,
          dueTime: task.dueTime,
          calendarSyncTargets: task.calendarSyncTargets,
        });
        
        const taskPayload = {
          id: data.id,
          title: task.title.trim(),
          notes: task.notes || undefined,
          dueDate: task.dueDate,
          dueTime: task.dueTime || undefined,
          endTime: task.endTime || undefined,
          address: task.address || undefined,
          timezone: getBrowserTimezone(),
        };
        
        const syncTargets = task.calendarSyncTargets;
        
        // Determine target user IDs for multi-target sync
        if (syncTargets && syncTargets.mode !== "mine") {
          // Admin multi-target sync
          const targetUserIds = syncTargets.mode === "all" 
            ? undefined  // Edge function will handle "all"
            : syncTargets.userIds || [];
          
          const syncBody = { 
            action: 'sync_task', 
            task: taskPayload, 
            targetUserIds,
            syncMode: syncTargets.mode,
          };
          
          await Promise.allSettled([
            supabase.functions.invoke('sync-google-calendar', { body: syncBody }),
            supabase.functions.invoke('sync-apple-calendar', { body: syncBody }),
          ]);
        } else {
          // Default: sync to creator's calendar only
          const googlePromise = supabase.functions.invoke('sync-google-calendar', {
            body: { action: 'sync_task', task: taskPayload },
          });

          const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T> =>
            new Promise((resolve, reject) => {
              const t = setTimeout(() => reject(new Error(`timeout_${ms}ms`)), ms);
              p.then((v) => {
                clearTimeout(t);
                resolve(v);
              }).catch((e) => {
                clearTimeout(t);
                reject(e);
              });
            });

          void withTimeout(
            supabase.functions.invoke('sync-apple-calendar', {
              body: { action: 'sync_task', task: taskPayload },
            }),
            6000
          ).catch((err) => {
            console.warn('[TasksContext] Apple calendar sync failed (non-blocking):', err);
          });

          const googleResult = await googlePromise;

          const googleHasError = Boolean((googleResult as any)?.error || (googleResult as any)?.data?.error);

          if (googleHasError) {
            console.error('[TasksContext] Google calendar sync failed:', googleResult);
            toast({
              title: "Task created",
              description: "Google calendar sync failed. Please check your calendar connection.",
              variant: "destructive",
            });
          } else {
            console.log('[TasksContext] Task synced to connected calendars');
          }
        }
      } else {
        console.log('[TasksContext] Task not synced to external calendar:', {
          syncToExternalCalendar: task.syncToExternalCalendar,
          dueDate: task.dueDate,
        });
      }

      const mappedTask: Task = {
        id: data.id,
        title: data.title,
        date: data.date || (data.due_date ? formatLegacyTaskDate(new Date(data.due_date).toISOString().split('T')[0]) : ''),
        address: data.address || '',
        assignee: data.assignee || '',
        hasAIAssist: data.has_ai_assist,
        priority: data.priority as "high" | "medium" | "low",
        notes: data.notes || '',
        status: data.status as "pending" | "in-progress" | "completed",
        startDate: data.start_date ? new Date(data.start_date).toISOString().split('T')[0] : undefined,
        dueDate: data.due_date ? new Date(data.due_date).toISOString().split('T')[0] : undefined,
        dueTime: data.due_time ? data.due_time.substring(0, 5) : undefined,
        endTime: data.end_time ? data.end_time.substring(0, 5) : undefined,
        buyerId: data.buyer_id || undefined,
        listingId: data.listing_id || undefined,
        userId: data.user_id,
        contactId: data.contact_id || undefined,
        assigneeUserId: data.assignee_user_id || undefined,
        assigneeUserIds: assigneeIds,
        showOnCalendar: data.show_on_calendar || false,
        syncToExternalCalendar: data.sync_to_external_calendar || false,
        externalCalendarEventId: data.external_calendar_event_id || undefined,
        recurrencePattern: data.recurrence_pattern || undefined,
        recurrenceEndDate: data.recurrence_end_date || undefined,
        parentTaskId: data.parent_task_id || undefined,
        recurrenceIndex: data.recurrence_index ?? undefined,
        includeWeekends: data.include_weekends ?? undefined,
        isDemo: false,
      };

      setTasks((prevTasks) => [...prevTasks, mappedTask]);

      // If this is a recurring task, generate initial instances
      if (task.recurrencePattern) {
        void supabase.functions.invoke('generate-recurring-tasks', {
          body: { parentTaskId: data.id, userId: user.id },
        }).then(() => {
          // Refetch to pick up generated instances
          fetchTasks();
        }).catch((err) => {
          console.warn('[TasksContext] Recurrence generation failed:', err);
        });
      }

      if (!silent) {
        toast({
          title: "Success",
          description: task.recurrencePattern 
            ? "Recurring task created. Upcoming instances will be generated automatically."
            : task.showOnCalendar 
              ? "Task created and added to calendar." 
              : "Task created successfully.",
        });
      }
    } catch (error: any) {
      console.error('[TasksContext] Error adding task:', error);
      if (!silent) {
        toast({
          title: "Error",
          description: error?.message || "Failed to create task. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const addTaskAssignees = async (taskId: string, userIds: string[]) => {
    if (!user || isDemoId(taskId)) return;

    try {
      // Insert new assignees (ignore conflicts for already-assigned users)
      const assignees = userIds.map(userId => ({
        task_id: taskId,
        user_id: userId,
        assigned_by: user.id,
      }));

      const { error } = await supabase
        .from('task_assignees')
        .upsert(assignees, { onConflict: 'task_id,user_id' });

      if (error) throw error;

      // Update local state
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId
            ? {
                ...task,
                assigneeUserIds: [...new Set([...(task.assigneeUserIds || []), ...userIds])],
              }
            : task
        )
      );
    } catch (error: any) {
      console.error('Error adding assignees:', error);
      toast({
        title: "Error",
        description: "Failed to add assignees.",
        variant: "destructive",
      });
    }
  };

  const removeTaskAssignee = async (taskId: string, userId: string) => {
    if (!user || isDemoId(taskId)) return;

    try {
      const { error } = await supabase
        .from('task_assignees')
        .delete()
        .eq('task_id', taskId)
        .eq('user_id', userId);

      if (error) throw error;

      // Update local state
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId
            ? {
                ...task,
                assigneeUserIds: (task.assigneeUserIds || []).filter(id => id !== userId),
              }
            : task
        )
      );
    } catch (error: any) {
      console.error('Error removing assignee:', error);
      toast({
        title: "Error",
        description: "Failed to remove assignee.",
        variant: "destructive",
      });
    }
  };

  // Bulk enable external sync for all tasks that are on dashboard calendar but not yet synced
  const bulkEnableExternalSync = async () => {
    if (!user) return;

    try {
      // Find all tasks that are on dashboard calendar but NOT synced to external
      const tasksToSync = tasks.filter(
        (t) => t.showOnCalendar && !t.syncToExternalCalendar && !t.isDemo
      );

      if (tasksToSync.length === 0) return;

      const taskIds = tasksToSync.map((t) => t.id);

      // Batch update in database
      const { error } = await supabase
        .from("tasks")
        .update({ sync_to_external_calendar: true })
        .in("id", taskIds);

      if (error) throw error;

      // Update local state
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          taskIds.includes(task.id)
            ? { ...task, syncToExternalCalendar: true }
            : task
        )
      );

      // Trigger sync to all connected calendars for synced tasks
      try {
        await Promise.allSettled([
          supabase.functions.invoke('sync-google-calendar', {
            body: { action: 'sync_all', taskIds },
          }),
          supabase.functions.invoke('sync-apple-calendar', {
            body: { action: 'sync_all', taskIds },
          }),
        ]);
      } catch (syncErr) {
        console.error('Error syncing to calendars:', syncErr);
        // Don't throw - database was updated, just sync failed
      }

      toast({
        title: "Tasks synced",
        description: `${tasksToSync.length} task${tasksToSync.length !== 1 ? "s" : ""} will sync to your connected calendar.`,
      });
    } catch (error: any) {
      console.error("Error bulk syncing tasks:", error);
      toast({
        title: "Error",
        description: "Failed to sync some tasks. Please try again.",
        variant: "destructive",
      });
    }
  };

  const openTaskModal = (task: Task) => {
    setSelectedTask(task);
    setIsTaskDetailsModalOpen(true);
  };

  return (
    <TasksContext.Provider
      value={{
        tasks,
        updateTask,
        deleteTask,
        addTask,
        addTaskAssignees,
        removeTaskAssignee,
        bulkEnableExternalSync,
        selectedTask,
        setSelectedTask,
        isTaskDetailsModalOpen,
        setIsTaskDetailsModalOpen,
        openTaskModal,
        loading,
        refetchTasks: fetchTasks,
      }}
    >
      {children}
    </TasksContext.Provider>
  );
}

export function useTasks() {
  const context = useContext(TasksContext);
  if (context === undefined) {
    throw new Error("useTasks must be used within a TasksProvider");
  }
  return context;
}
