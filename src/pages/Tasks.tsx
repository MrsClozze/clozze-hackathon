import { useState, useMemo } from "react";
import Layout from "@/components/layout/Layout";
import { useTasks } from "@/contexts/TasksContext";
import { useBuyers } from "@/contexts/BuyersContext";
import { useListings } from "@/contexts/ListingsContext";
import { useAccountState } from "@/contexts/AccountStateContext";
import { useTeamMemberSlots } from "@/hooks/useTeamMemberSlots";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, MapPin, User, Plus, Info, Users } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import TaskDetailsModal from "@/components/dashboard/TaskDetailsModal";
import AddTaskModal from "@/components/dashboard/AddTaskModal";

type StatusFilter = "all" | "pending" | "in-progress" | "completed";
type CategoryFilter = "all" | "buyers" | "listings";
type ViewTab = "my-tasks" | "team";

export default function Tasks() {
  const { tasks, loading, openTaskModal } = useTasks();
  const { buyers } = useBuyers();
  const { listings } = useListings();
  const { isDemo } = useAccountState();
  const { user } = useAuth();
  const { hasTeamMemberAccess, loading: slotsLoading } = useTeamMemberSlots();
  const [viewTab, setViewTab] = useState<ViewTab>("my-tasks");
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
    
    if (days < 0) return "bg-destructive/10 border-destructive text-destructive";
    if (days <= 3) return "bg-destructive/10 border-destructive/50 text-destructive";
    if (days <= 7) return "bg-warning/10 border-warning/50 text-warning";
    return "bg-primary/10 border-primary/50 text-primary";
  };

  // Filter tasks based on view tab (my tasks vs team assigned to me)
  const baseTasks = useMemo(() => {
    if (viewTab === "team" && user) {
      // Show only tasks assigned to the current user (by assignee_user_id)
      return tasks.filter(task => task.assigneeUserId === user.id);
    }
    // Default: show all tasks owned by the user
    return tasks;
  }, [tasks, viewTab, user]);

  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    let filtered = baseTasks;

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
  }, [baseTasks, statusFilter, categoryFilter]);

  // Count tasks assigned to the current user
  const assignedToMeCount = useMemo(() => {
    if (!user) return 0;
    return tasks.filter(task => task.assigneeUserId === user.id).length;
  }, [tasks, user]);

  const getStatusBadge = (status: string | undefined) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="bg-primary">Completed</Badge>;
      case "in-progress":
        return <Badge variant="default" className="bg-accent-gold">In Progress</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (loading || slotsLoading) {
    return (
      <Layout>
        <div className="p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-text-heading mb-2">Tasks & To Do</h1>
            <p className="text-text-muted">Track and manage all your transaction tasks and deadlines.</p>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-text-heading">Tasks & To Do</h1>
              {isDemo && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-accent-gold/10 border border-accent-gold/30 text-accent-gold text-xs font-medium">
                  <Info className="h-3 w-3" />
                  Demo Mode
                </span>
              )}
            </div>
            <p className="text-text-muted">Track and manage all your transaction tasks and deadlines.</p>
          </div>
          <Button onClick={() => setIsAddTaskModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Task
          </Button>
        </div>

        {/* Demo mode hint */}
        {isDemo && (
          <div className="mb-6 p-4 rounded-lg border border-accent-gold/30 bg-accent-gold/5">
            <p className="text-sm text-text-muted">
              <strong className="text-accent-gold">Demo Mode:</strong> You're viewing sample tasks. Add your first real listing or buyer to switch to live mode!
            </p>
          </div>
        )}

        {/* View Tabs - My Tasks vs Team (only show if has team add-on) */}
        {hasTeamMemberAccess && (
          <Tabs value={viewTab} onValueChange={(v) => setViewTab(v as ViewTab)} className="mb-6">
            <TabsList>
              <TabsTrigger value="my-tasks" className="gap-2">
                <User className="h-4 w-4" />
                My Tasks
              </TabsTrigger>
              <TabsTrigger value="team" className="gap-2">
                <Users className="h-4 w-4" />
                Assigned to Me
                {assignedToMeCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {assignedToMeCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

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
                {viewTab === "team" 
                  ? "No tasks have been assigned to you yet."
                  : "No tasks found matching your filters."
                }
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
