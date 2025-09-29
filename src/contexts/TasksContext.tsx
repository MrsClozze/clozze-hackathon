import { createContext, useContext, useState, ReactNode } from "react";

export interface Task {
  id: number;
  title: string;
  date: string;
  address: string;
  assignee: string;
  hasAIAssist: boolean;
  priority: "high" | "medium" | "low";
  notes: string;
  status?: "pending" | "in-progress" | "completed";
  dueDate?: string;
  buyerId?: number;
  listingId?: number;
}

interface TasksContextType {
  tasks: Task[];
  updateTask: (taskId: number, updates: Partial<Task>) => void;
  deleteTask: (taskId: number) => void;
  selectedTask: Task | null;
  setSelectedTask: (task: Task | null) => void;
  isTaskDetailsModalOpen: boolean;
  setIsTaskDetailsModalOpen: (open: boolean) => void;
  openTaskModal: (task: Task) => void;
}

const TasksContext = createContext<TasksContextType | undefined>(undefined);

const initialTasks: Task[] = [
  {
    id: 1,
    title: "Schedule Property Viewing",
    date: "Dec 15, 2024",
    dueDate: "2024-12-15",
    address: "123 Elm Street",
    assignee: "Sarah Johnson",
    hasAIAssist: true,
    priority: "high",
    notes: "",
    status: "pending",
    buyerId: 1,
  },
  {
    id: 2,
    title: "Prepare Contract",
    date: "Dec 18, 2024",
    dueDate: "2024-12-18",
    address: "456 Oak Avenue",
    assignee: "Michael Brown",
    hasAIAssist: false,
    priority: "high",
    notes: "",
    status: "in-progress",
    listingId: 1,
  },
  {
    id: 3,
    title: "Schedule Property Inspector",
    date: "Dec 20, 2024",
    dueDate: "2024-12-20",
    address: "456 Oak Avenue",
    assignee: "ABC Inspections",
    hasAIAssist: true,
    priority: "medium",
    notes: "",
    status: "pending",
    listingId: 1,
  },
  {
    id: 4,
    title: "Review Documents",
    date: "Dec 22, 2024",
    dueDate: "2024-12-22",
    address: "789 Pine Lane",
    assignee: "Emily Davis",
    hasAIAssist: false,
    priority: "medium",
    notes: "",
    status: "pending",
    buyerId: 2,
  },
  {
    id: 5,
    title: "Get client pre-approved",
    date: "Mar 15, 2024",
    dueDate: "2024-03-15",
    address: "",
    assignee: "",
    hasAIAssist: false,
    priority: "high",
    notes: "",
    status: "in-progress",
    buyerId: 1,
  },
  {
    id: 6,
    title: "Schedule property viewings",
    date: "Mar 20, 2024",
    dueDate: "2024-03-20",
    address: "",
    assignee: "",
    hasAIAssist: false,
    priority: "medium",
    notes: "",
    status: "pending",
    buyerId: 1,
  },
  {
    id: 7,
    title: "Review purchase agreement",
    date: "Mar 10, 2024",
    dueDate: "2024-03-10",
    address: "",
    assignee: "",
    hasAIAssist: false,
    priority: "low",
    notes: "",
    status: "completed",
    buyerId: 1,
  },
];

export function TasksProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskDetailsModalOpen, setIsTaskDetailsModalOpen] = useState(false);

  const updateTask = (taskId: number, updates: Partial<Task>) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId ? { ...task, ...updates } : task
      )
    );
    // Update selected task if it's the one being edited
    if (selectedTask?.id === taskId) {
      setSelectedTask((prev) => (prev ? { ...prev, ...updates } : null));
    }
  };

  const deleteTask = (taskId: number) => {
    setTasks((prevTasks) => prevTasks.filter((task) => task.id !== taskId));
    if (selectedTask?.id === taskId) {
      setSelectedTask(null);
      setIsTaskDetailsModalOpen(false);
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
        selectedTask,
        setSelectedTask,
        isTaskDetailsModalOpen,
        setIsTaskDetailsModalOpen,
        openTaskModal,
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
