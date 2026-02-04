import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "./AuthContext";
import { useAccountState } from "./AccountStateContext";
import { DEMO_TASKS, isDemoId } from "@/data/demoData";

// Helper to get browser timezone
const getBrowserTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export interface TaskAssignee {
  userId: string;
  name?: string;
  assignedAt?: string;
}

export interface Task {
  id: string;
  title: string;
  date: string;
  address: string;
  assignee: string; // Legacy single assignee name (for display)
  hasAIAssist: boolean;
  priority: "high" | "medium" | "low";
  notes: string;
  status?: "pending" | "in-progress" | "completed";
  dueDate?: string;
  dueTime?: string; // Start time in HH:mm format
  endTime?: string; // End time in HH:mm format
  buyerId?: string;
  listingId?: string;
  userId?: string;
  contactId?: string;
  assigneeUserId?: string; // Legacy single assignee (kept for backward compatibility)
  assigneeUserIds?: string[]; // New: multiple assignees
  assignees?: TaskAssignee[]; // New: assignee details with names
  showOnCalendar?: boolean; // Whether task appears on dashboard calendar
  syncToExternalCalendar?: boolean; // Whether to sync to connected calendar (Google/Apple)
  isDemo?: boolean;
}

interface TasksContextType {
  tasks: Task[];
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  addTask: (task: Omit<Task, 'id'>) => Promise<void>;
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

      const mappedTasks: Task[] = (tasksData || []).map((task: any) => ({
        id: task.id,
        title: task.title,
        date: task.date || '',
        address: task.address || '',
        assignee: task.assignee || '',
        hasAIAssist: task.has_ai_assist,
        priority: task.priority as "high" | "medium" | "low",
        notes: task.notes || '',
        status: task.status as "pending" | "in-progress" | "completed",
        dueDate: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : undefined,
        dueTime: task.due_time ? task.due_time.substring(0, 5) : undefined, // Format as HH:mm
        endTime: task.end_time ? task.end_time.substring(0, 5) : undefined, // Format as HH:mm
        buyerId: task.buyer_id || undefined,
        listingId: task.listing_id || undefined,
        userId: task.user_id,
        contactId: task.contact_id || undefined,
        assigneeUserId: task.assignee_user_id || undefined,
        assigneeUserIds: (task.task_assignees || []).map((a: any) => a.user_id).filter(Boolean),
        showOnCalendar: task.show_on_calendar || false,
        syncToExternalCalendar: task.sync_to_external_calendar || false,
        isDemo: false,
      }));

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
        date: updates.date,
        address: updates.address,
        assignee: updates.assignee,
        has_ai_assist: updates.hasAIAssist,
        priority: updates.priority,
        notes: updates.notes,
        status: updates.status,
        due_date: updates.dueDate ? new Date(updates.dueDate).toISOString() : null,
        due_time: updates.dueTime !== undefined ? (updates.dueTime || null) : undefined,
        end_time: updates.endTime !== undefined ? (updates.endTime || null) : undefined,
        buyer_id: updates.buyerId || null,
        listing_id: updates.listingId || null,
        contact_id: updates.contactId || null,
        assignee_user_id: updates.assigneeUserId || null,
        show_on_calendar: updates.showOnCalendar,
        sync_to_external_calendar: updates.syncToExternalCalendar,
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

      // If syncToExternalCalendar was just enabled, sync to Google Calendar
      if (updates.syncToExternalCalendar === true) {
        const currentTask = tasks.find(t => t.id === taskId);
        if (currentTask?.dueDate) {
          try {
            await supabase.functions.invoke('sync-google-calendar', {
              body: {
                action: 'sync_task',
                task: {
                  id: taskId,
                  title: updates.title || currentTask.title,
                  notes: updates.notes ?? currentTask.notes,
                  dueDate: updates.dueDate || currentTask.dueDate,
                  dueTime: updates.dueTime ?? currentTask.dueTime,
                  endTime: updates.endTime ?? currentTask.endTime,
                  address: updates.address ?? currentTask.address,
                  timezone: getBrowserTimezone(), // Pass browser timezone
                },
              },
            });
          } catch (syncErr) {
            console.error('[TasksContext] Google Calendar sync error:', syncErr);
          }
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

  const addTask = async (task: Omit<Task, 'id'>) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to add a task.",
        variant: "destructive",
      });
      return;
    }

    // Validate required fields
    if (!task.title?.trim()) {
      toast({
        title: "Error",
        description: "Task title is required.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Build task object, ensuring all values are properly typed
      const newTask = {
        user_id: user.id,
        title: task.title.trim(),
        date: task.date || null,
        address: task.address || null,
        assignee: task.assignee || null,
        has_ai_assist: task.hasAIAssist ?? false,
        priority: task.priority || 'medium',
        notes: task.notes || null,
        status: task.status || 'pending',
        due_date: task.dueDate ? new Date(task.dueDate).toISOString() : null,
        due_time: task.dueTime || null,
        end_time: task.endTime || null,
        buyer_id: task.buyerId || null,
        listing_id: task.listingId || null,
        contact_id: task.contactId || null,
        assignee_user_id: task.assigneeUserId || null,
        show_on_calendar: task.showOnCalendar ?? false,
        sync_to_external_calendar: task.syncToExternalCalendar ?? false,
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

      // If showOnCalendar is true, create a calendar event
      if (task.showOnCalendar && task.dueDate) {
        const calendarEvent = {
          user_id: user.id,
          title: task.title.trim(),
          event_date: task.dueDate,
          event_time: task.dueTime || null, // Include time if provided
          description: task.notes || null,
          address: task.address || null,
          event_type: 'task',
          source: 'manual',
        };

        const { error: calendarError } = await supabase
          .from('calendar_events')
          .insert(calendarEvent);

        if (calendarError) {
          console.error('[TasksContext] Calendar event insert error:', calendarError);
          // Don't throw - task was created, just calendar event failed
        } else {
          console.log('[TasksContext] Calendar event created for task');
        }
      }

      // If syncToExternalCalendar is true, sync to Google Calendar
      if (task.syncToExternalCalendar && task.dueDate) {
        console.log('[TasksContext] Syncing task to Google Calendar:', {
          taskId: data.id,
          title: task.title,
          dueDate: task.dueDate,
          dueTime: task.dueTime,
        });
        
        try {
          const { data: syncData, error: syncError } = await supabase.functions.invoke('sync-google-calendar', {
            body: {
              action: 'sync_task',
              task: {
                id: data.id,
                title: task.title.trim(),
                notes: task.notes || undefined,
                dueDate: task.dueDate,
                dueTime: task.dueTime || undefined,
                endTime: task.endTime || undefined,
                address: task.address || undefined,
                timezone: getBrowserTimezone(), // Pass browser timezone
              },
            },
          });

          if (syncError) {
            console.error('[TasksContext] Google Calendar sync error:', syncError);
            // Don't throw - task was created, just sync failed
            toast({
              title: "Task created",
              description: "Calendar sync failed. Please try reconnecting your calendar.",
              variant: "destructive",
            });
          } else {
            console.log('[TasksContext] Task synced to Google Calendar:', syncData);
          }
        } catch (syncErr) {
          console.error('[TasksContext] Google Calendar sync exception:', syncErr);
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
        date: data.date || '',
        address: data.address || '',
        assignee: data.assignee || '',
        hasAIAssist: data.has_ai_assist,
        priority: data.priority as "high" | "medium" | "low",
        notes: data.notes || '',
        status: data.status as "pending" | "in-progress" | "completed",
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
        isDemo: false,
      };

      setTasks((prevTasks) => [...prevTasks, mappedTask]);

      toast({
        title: "Success",
        description: task.showOnCalendar 
          ? "Task created and added to calendar." 
          : "Task created successfully.",
      });
    } catch (error: any) {
      console.error('[TasksContext] Error adding task:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to create task. Please try again.",
        variant: "destructive",
      });
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

      // Trigger sync to Google Calendar for all synced tasks
      try {
        await supabase.functions.invoke('sync-google-calendar', {
          body: {
            action: 'sync_all',
            taskIds,
          },
        });
      } catch (syncErr) {
        console.error('Error syncing to Google Calendar:', syncErr);
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
