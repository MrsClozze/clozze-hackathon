import { useState, useMemo } from "react";
import Layout from "@/components/layout/Layout";
import { useTasks } from "@/contexts/TasksContext";
import { useBuyers } from "@/contexts/BuyersContext";
import { useListings } from "@/contexts/ListingsContext";
import { useAccountState } from "@/contexts/AccountStateContext";
import { useTeamMemberSlots } from "@/hooks/useTeamMemberSlots";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, MapPin, User, Plus, Info, Users, CalendarRange, Repeat, Home } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import TaskDetailsModal from "@/components/dashboard/TaskDetailsModal";
import AddTaskModal from "@/components/dashboard/AddTaskModal";
import AITaskInput from "@/components/dashboard/AITaskInput";

type StatusFilter = "all" | "active" | "completed";

type TypeFilterState = {
  buyers: boolean;
  listings: boolean;
  general: boolean;
};

export default function Tasks() {
  const { tasks, loading, openTaskModal } = useTasks();
  const { buyers } = useBuyers();
  const { listings } = useListings();
  const { isDemo } = useAccountState();
  const { user } = useAuth();
  const { hasTeamMemberAccess, loading: slotsLoading } = useTeamMemberSlots();
  const { teamMembers, loading: teamLoading } = useTeamMembers();
  const [viewTab, setViewTab] = useState<string>("my-tasks");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilterState>({ buyers: true, listings: true, general: true });
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);

  // Teammates = team members excluding the current user
  const teammates = useMemo(() => {
    if (!user) return [];
    return teamMembers.filter(m => m.userId !== user.id);
  }, [teamMembers, user]);

  // Check if task is assigned to the current user (via junction table or legacy field)
  const isAssignedToMe = (task: any) => {
    if (!user) return false;
    const assigneeIds: string[] = Array.isArray(task.assigneeUserIds) ? task.assigneeUserIds : [];
    return assigneeIds.includes(user.id) || task.assigneeUserId === user.id;
  };

  // Check if task is associated with a specific user (owner or assignee)
  const isTaskForUser = (task: any, userId: string) => {
    const assigneeIds: string[] = Array.isArray(task.assigneeUserIds) ? task.assigneeUserIds : [];
    if (assigneeIds.includes(userId)) return true;
    if (task.assigneeUserId === userId) return true;
    // Also show tasks the user owns with no other assignees
    const hasAnyAssignees =
      (assigneeIds.length > 0) || Boolean(task.assigneeUserId);
    return !hasAnyAssignees && task.userId === userId;
  };

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

  const getUrgencyColor = (dueDate: string | undefined) => {
    if (!dueDate) return "bg-muted text-muted-foreground";
    const days = differenceInDays(parseISO(dueDate), new Date());
    if (days < 0) return "bg-destructive/10 border-destructive text-destructive";
    if (days <= 3) return "bg-destructive/10 border-destructive/50 text-destructive";
    if (days <= 7) return "bg-warning/10 border-warning/50 text-warning";
    return "bg-primary/10 border-primary/50 text-primary";
  };

  const baseTasks = useMemo(() => {
    if (!user) return [];
    if (viewTab === "my-tasks") {
      return tasks.filter((task) => {
        if (isAssignedToMe(task)) return true;
        const hasAnyAssignees =
          (Array.isArray(task.assigneeUserIds) && task.assigneeUserIds.length > 0) ||
          Boolean(task.assigneeUserId);
        return !hasAnyAssignees && task.userId === user.id;
      });
    }
    // viewTab is a teammate userId
    return tasks.filter((task) => isTaskForUser(task, viewTab));
  }, [tasks, viewTab, user]);

  const filteredTasks = useMemo(() => {
    let filtered = baseTasks;

    if (statusFilter === "active") {
      filtered = filtered.filter(task => task.status !== "completed");
    } else if (statusFilter === "completed") {
      filtered = filtered.filter(task => task.status === "completed");
    }

    const showBuyers = typeFilter.buyers;
    const showListings = typeFilter.listings;
    const showGeneral = typeFilter.general;
    const allSelected = showBuyers && showListings && showGeneral;

    if (!allSelected) {
      filtered = filtered.filter(task => {
        if (task.buyerId && showBuyers) return true;
        if (task.listingId && showListings) return true;
        if (!task.buyerId && !task.listingId && showGeneral) return true;
        return false;
      });
    }

    return filtered.sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime();
    });
  }, [baseTasks, statusFilter, typeFilter]);

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

  if (loading || slotsLoading || teamLoading) {
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

        {isDemo && (
          <div className="mb-6 p-4 rounded-lg border border-accent-gold/30 bg-accent-gold/5">
            <p className="text-sm text-text-muted">
              <strong className="text-accent-gold">Demo Mode:</strong> You're viewing sample tasks. Add your first real listing or buyer to switch to live mode!
            </p>
          </div>
        )}

        <AITaskInput
          teamMembers={teammates.map(m => ({ userId: m.userId, name: m.name }))}
          buyers={buyers.map(b => ({ id: b.id, firstName: b.firstName, lastName: b.lastName }))}
          listings={listings.map(l => ({ id: l.id, address: l.address }))}
        />

        {hasTeamMemberAccess && teammates.length > 0 && (
          <div className="mb-6">
            <div className="inline-flex h-11 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground flex-wrap gap-1">
              <button
                onClick={() => setViewTab("my-tasks")}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-all gap-2 ${
                  viewTab === "my-tasks"
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "hover:bg-muted-foreground/10"
                }`}
              >
                <User className="h-4 w-4" />
                My Tasks
              </button>
              {teammates.map((member) => (
                <button
                  key={member.userId}
                  onClick={() => setViewTab(member.userId)}
                  className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-all gap-2 ${
                    viewTab === member.userId
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "hover:bg-muted-foreground/10"
                  }`}
                >
                  {member.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Secondary filter: Task context */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-sm text-muted-foreground mr-2">Filter by type</span>
          <Button
            variant={typeFilter.buyers ? "default" : "outline"}
            size="sm"
            onClick={() =>
              setTypeFilter((prev) => {
                const next = { ...prev, buyers: !prev.buyers };
                if (!next.buyers && !next.listings && !next.general) return prev;
                return next;
              })
            }
          >
            Buyers
          </Button>
          <Button
            variant={typeFilter.listings ? "default" : "outline"}
            size="sm"
            onClick={() =>
              setTypeFilter((prev) => {
                const next = { ...prev, listings: !prev.listings };
                if (!next.buyers && !next.listings && !next.general) return prev;
                return next;
              })
            }
          >
            Listings
          </Button>
          <Button
            variant={typeFilter.general ? "default" : "outline"}
            size="sm"
            onClick={() =>
              setTypeFilter((prev) => {
                const next = { ...prev, general: !prev.general };
                if (!next.buyers && !next.listings && !next.general) return prev;
                return next;
              })
            }
          >
            General
          </Button>
        </div>

        {/* Status Filter */}
        <div className="mb-6">
          <div className="inline-flex h-10 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
            <button
              onClick={() => setStatusFilter("all")}
              className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
                statusFilter === "all"
                  ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                  : "hover:bg-muted-foreground/10"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter("active")}
              className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
                statusFilter === "active"
                  ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                  : "hover:bg-muted-foreground/10"
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter("completed")}
              className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
                statusFilter === "completed"
                  ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                  : "hover:bg-muted-foreground/10"
              }`}
            >
              Completed
            </button>
          </div>
        </div>

        {/* Tasks List */}
        <div className="space-y-4">
          {filteredTasks.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                {viewTab !== "my-tasks"
                  ? `No tasks found for this teammate.`
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
                        {task.recurrencePattern && (
                          <Badge variant="outline" className="gap-1 text-xs">
                            <Repeat className="h-3 w-3" />
                            {task.recurrencePattern === 'daily' ? 'Daily' : task.recurrencePattern === 'weekly' ? 'Weekly' : task.recurrencePattern === 'biweekly' ? 'Biweekly' : 'Monthly'}
                          </Badge>
                        )}
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
                          <Badge variant="secondary" className="text-xs gap-1">
                            {task.buyerId ? (
                              <><User className="h-3 w-3" /> Buyer: {getTaskSourceName(task)}</>
                            ) : (
                              <><Home className="h-3 w-3" /> Listing: {getTaskSourceName(task)}</>
                            )}
                          </Badge>
                        </div>
                      )}
                      
                      <div className="space-y-2 text-sm text-text-muted">
                        {(task.startDate || task.dueDate) && (
                          <div className="flex items-center gap-2">
                            {task.startDate ? (
                              <>
                                <CalendarRange className="w-4 h-4" />
                                <span>
                                  {format(parseISO(task.startDate), "MMM d")} – {task.dueDate ? format(parseISO(task.dueDate), "MMM d, yyyy") : "No end date"}
                                </span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-4 h-4" />
                                <span>Due: {format(parseISO(task.dueDate!), "MMM d, yyyy")}</span>
                              </>
                            )}
                            {task.dueDate && differenceInDays(parseISO(task.dueDate), new Date()) < 0 && (
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
