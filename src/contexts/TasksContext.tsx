import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

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

// Initial demo tasks for when database is empty or user is not authenticated
const initialTasks: Task[] = [
  {
    id: "demo-1",
    title: "Schedule Property Viewing",
    date: "Dec 15, 2024",
    dueDate: "2024-12-15",
    address: "123 Elm Street",
    assignee: "Sarah Johnson",
    hasAIAssist: true,
    priority: "high",
    notes: "",
    status: "pending",
    buyerId: "1",
  },
  {
    id: "demo-2",
    title: "Prepare Contract",
    date: "Dec 18, 2024",
    dueDate: "2024-12-18",
    address: "456 Oak Avenue",
    assignee: "Michael Brown",
    hasAIAssist: false,
    priority: "high",
    notes: "",
    status: "in-progress",
    listingId: "1",
  },
  {
    id: "demo-3",
    title: "Schedule Property Inspector",
    date: "Dec 20, 2024",
    dueDate: "2024-12-20",
    address: "456 Oak Avenue",
    assignee: "ABC Inspections",
    hasAIAssist: true,
    priority: "medium",
    notes: "",
    status: "pending",
    listingId: "1",
  },
  {
    id: "demo-4",
    title: "Review Documents",
    date: "Dec 22, 2024",
    dueDate: "2024-12-22",
    address: "789 Pine Lane",
    assignee: "Emily Davis",
    hasAIAssist: false,
    priority: "medium",
    notes: "",
    status: "pending",
    buyerId: "2",
  },
  {
    id: "demo-5",
    title: "Get client pre-approved",
    date: "Mar 15, 2024",
    dueDate: "2024-03-15",
    address: "",
    assignee: "",
    hasAIAssist: false,
    priority: "high",
    notes: "",
    status: "in-progress",
    buyerId: "1",
  },
  {
    id: "demo-7",
    title: "Review purchase agreement",
    date: "Mar 10, 2024",
    dueDate: "2024-03-10",
    address: "",
    assignee: "",
    hasAIAssist: false,
    priority: "low",
    notes: "",
    status: "completed",
    buyerId: "1",
  },
];

export function TasksProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskDetailsModalOpen, setIsTaskDetailsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTasks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // If no user, use demo tasks
      if (!user) {
        setTasks(initialTasks);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('due_date', { ascending: true });

      if (error) throw error;

      // If database is empty, use initial demo tasks for demonstration
      if (!data || data.length === 0) {
        setTasks(initialTasks);
        setLoading(false);
        return;
      }

      const mappedTasks: Task[] = data.map((task: any) => ({
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
      }));

      setTasks(mappedTasks);
    } catch (error: any) {
      console.error('Error fetching tasks:', error);
      // On error, fall back to demo tasks
      setTasks(initialTasks);
      toast({
        title: "Info",
        description: "Using demo tasks. Sign in to save your tasks permanently.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      // Check if this is a demo task (starts with "demo-")
      const isDemoTask = taskId.startsWith("demo-");
      
      if (!isDemoTask) {
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
      }

      // Update local state (works for both demo and real tasks)
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === taskId ? { ...task, ...updates } : task
        )
      );

      // Update selected task if it's the one being edited
      if (selectedTask?.id === taskId) {
        setSelectedTask((prev) => (prev ? { ...prev, ...updates } : null));
      }

      toast({
        title: "Success",
        description: isDemoTask ? "Demo task updated (changes won't persist)." : "Task updated successfully.",
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
    try {
      // Check if this is a demo task
      const isDemoTask = taskId.startsWith("demo-");
      
      if (!isDemoTask) {
        const { error } = await supabase
          .from('tasks')
          .delete()
          .eq('id', taskId);

        if (error) throw error;
      }

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
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

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
