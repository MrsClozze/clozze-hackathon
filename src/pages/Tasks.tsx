import { useState, useMemo } from "react";
import Layout from "@/components/layout/Layout";
import { useTasks } from "@/contexts/TasksContext";
import { useBuyers } from "@/contexts/BuyersContext";
import { useListings } from "@/contexts/ListingsContext";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, MapPin, User, Plus } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import TaskDetailsModal from "@/components/dashboard/TaskDetailsModal";
import AddTaskModal from "@/components/dashboard/AddTaskModal";

type StatusFilter = "all" | "pending" | "in-progress" | "completed";
type CategoryFilter = "all" | "buyers" | "listings";

export default function Tasks() {
  const { tasks, openTaskModal } = useTasks();
  const { buyers } = useBuyers();
  const { listings } = useListings();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);

  // Helper to get buyer/listing name for a task
  const getTaskSourceName = (task: any) => {
    if (task.buyerId) {
      const buyer = buyers.find(b => b.id === task.buyerId);
      return buyer ? `${buyer.firstName} ${buyer.lastName}` : null;
    }
    if (task.listingId) {
      const listing = listings.find(l => l.id === task.listingId);
      return listing ? listing.address : null;
    }
    return null;
  };

  // Calculate urgency color based on due date
  const getUrgencyColor = (dueDate: string | undefined) => {
    if (!dueDate) return "bg-muted text-muted-foreground";
    
    const days = differenceInDays(parseISO(dueDate), new Date());
    
    if (days < 0) return "bg-destructive/10 border-destructive text-destructive"; // Overdue
    if (days <= 3) return "bg-red-500/10 border-red-500 text-red-700 dark:text-red-400"; // High risk (red)
    if (days <= 7) return "bg-yellow-500/10 border-yellow-500 text-yellow-700 dark:text-yellow-400"; // Medium urgency (yellow)
    return "bg-green-500/10 border-green-500 text-green-700 dark:text-green-400"; // Not at risk (green)
  };

  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    let filtered = tasks;

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(task => task.status === statusFilter);
    }

    // Filter by category
    if (categoryFilter === "buyers") {
      filtered = filtered.filter(task => task.buyerId);
    } else if (categoryFilter === "listings") {
      filtered = filtered.filter(task => task.listingId);
    }

    // Sort by due date (earliest first)
    return filtered.sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime();
    });
  }, [tasks, statusFilter, categoryFilter]);

  const getStatusBadge = (status: string | undefined) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="bg-green-500">Completed</Badge>;
      case "in-progress":
        return <Badge variant="default" className="bg-blue-500">In Progress</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <Layout>
      <div className="p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-heading mb-2">Tasks & To Do</h1>
            <p className="text-text-muted">Track and manage all your transaction tasks and deadlines.</p>
          </div>
          <Button onClick={() => setIsAddTaskModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Task
          </Button>
        </div>

        {/* Category Tabs */}
        <Tabs value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as CategoryFilter)} className="mb-6">
          <TabsList>
            <TabsTrigger value="all">All Tasks</TabsTrigger>
            <TabsTrigger value="buyers">Buyers</TabsTrigger>
            <TabsTrigger value="listings">Listings</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Status Filter */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              statusFilter === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter("pending")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              statusFilter === "pending"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setStatusFilter("in-progress")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              statusFilter === "in-progress"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setStatusFilter("completed")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              statusFilter === "completed"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Closed
          </button>
        </div>

        {/* Tasks List */}
        <div className="space-y-4">
          {filteredTasks.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No tasks found matching your filters.
              </CardContent>
            </Card>
          ) : (
            filteredTasks.map((task) => (
              <Card
                key={task.id}
                className={`cursor-pointer transition-all hover:shadow-md border-l-4 ${getUrgencyColor(task.dueDate)}`}
                onClick={() => openTaskModal(task)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-text-heading">{task.title}</h3>
                        {getStatusBadge(task.status)}
                        {task.priority && (
                          <Badge variant="outline" className="capitalize">
                            {task.priority} Priority
                          </Badge>
                        )}
                      </div>
                      
                      {/* Display linked Buyer/Listing name */}
                      {getTaskSourceName(task) && (
                        <div className="mb-2">
                          <Badge variant="secondary" className="text-xs">
                            {task.buyerId ? 'Buyer' : 'Listing'}: {getTaskSourceName(task)}
                          </Badge>
                        </div>
                      )}
                      
                      <div className="space-y-2 text-sm text-text-muted">
                        {task.dueDate && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>Due: {format(parseISO(task.dueDate), "MMM d, yyyy")}</span>
                            {differenceInDays(parseISO(task.dueDate), new Date()) < 0 && (
                              <Badge variant="destructive" className="ml-2">Overdue</Badge>
                            )}
                          </div>
                        )}
                        {task.address && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            <span>{task.address}</span>
                          </div>
                        )}
                        {task.assignee && (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            <span>{task.assignee}</span>
                          </div>
                        )}
                        {task.notes && (
                          <p className="mt-2 text-text-body line-clamp-2">{task.notes}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <TaskDetailsModal />
        <AddTaskModal open={isAddTaskModalOpen} onOpenChange={setIsAddTaskModalOpen} />
      </div>
    </Layout>
  );
}