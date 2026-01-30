import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "./AuthContext";
import { useAccountState } from "./AccountStateContext";
import { DEMO_TASKS, isDemoId } from "@/data/demoData";

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
  dueDate?: string;
  buyerId?: string;
  listingId?: string;
  userId?: string;
  contactId?: string;
  assigneeUserId?: string;
  isDemo?: boolean;
}

interface TasksContextType {
  tasks: Task[];
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  addTask: (task: Omit<Task, 'id'>) => Promise<void>;
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
  const { isDemo } = useAccountState();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskDetailsModalOpen, setIsTaskDetailsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTasks = useCallback(async () => {
    // In demo mode, show demo tasks
    if (isDemo) {
      setTasks(DEMO_TASKS.map(t => ({ ...t, isDemo: true })));
      setLoading(false);
      return;
    }

    // In live mode, fetch real data from database
    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('due_date', { ascending: true });

      if (error) throw error;

      const mappedTasks: Task[] = (data || []).map((task: any) => ({
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
        buyerId: task.buyer_id || undefined,
        listingId: task.listing_id || undefined,
        userId: task.user_id,
        contactId: task.contact_id || undefined,
        assigneeUserId: task.assignee_user_id || undefined,
        isDemo: false,
      }));

      setTasks(mappedTasks);
    } catch (error: any) {
      console.error('Error fetching tasks:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [user, isDemo]);

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
        buyer_id: updates.buyerId || null,
        listing_id: updates.listingId || null,
        contact_id: updates.contactId || null,
        assignee_user_id: updates.assigneeUserId || null,
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

    try {
      const newTask: any = {
        user_id: user.id,
        title: task.title,
        date: task.date,
        address: task.address || '',
        assignee: task.assignee || '',
        has_ai_assist: task.hasAIAssist,
        priority: task.priority,
        notes: task.notes || '',
        status: task.status || 'pending',
        due_date: task.dueDate ? new Date(task.dueDate).toISOString() : null,
        buyer_id: task.buyerId || null,
        listing_id: task.listingId || null,
        contact_id: task.contactId || null,
        assignee_user_id: task.assigneeUserId || null,
      };

      const { data, error } = await supabase
        .from('tasks')
        .insert(newTask)
        .select()
        .single();

      if (error) throw error;

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
        buyerId: data.buyer_id || undefined,
        listingId: data.listing_id || undefined,
        userId: data.user_id,
        contactId: data.contact_id || undefined,
        assigneeUserId: data.assignee_user_id || undefined,
        isDemo: false,
      };

      setTasks((prevTasks) => [...prevTasks, mappedTask]);

      toast({
        title: "Success",
        description: "Task created successfully.",
      });
    } catch (error: any) {
      console.error('Error adding task:', error);
      toast({
        title: "Error",
        description: "Failed to create task. Please try again.",
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
