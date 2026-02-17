import { useState, useCallback, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Calendar, Plus, Clock, X, Check, Loader2, Edit2, Unlink, Settings, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useCalendarConnections } from "@/hooks/useCalendarConnections";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { CalendarSyncConfirmDialog } from "@/components/integrations/CalendarSyncConfirmDialog";
import { CalendarEventDeleteDialog } from "@/components/dashboard/CalendarEventDeleteDialog";
import { useTasks } from "@/contexts/TasksContext";
import { supabase } from "@/integrations/supabase/client";
import googleCalendarLogo from "@/assets/google-calendar-logo.png";
import appleCalendarLogo from "@/assets/apple-calendar-logo.png";

interface CalendarEvent {
  id: string;
  date: number;
  month: number;
  year: number;
  title: string;
  time?: string;
  description?: string;
  color: string;
  textColor: string;
  isTask?: boolean;
  taskId?: string;
  isTeamEvent?: boolean;
  ownerName?: string;
  ownerUserId?: string;
}

// Helper function to format 24-hour time to 12-hour format
const formatTimeTo12Hour = (time24: string | undefined): string => {
  if (!time24) return "";
  const [hours, minutes] = time24.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return time24;
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

// Apple Calendar Connection Modal
function AppleCalendarModal({ 
  isOpen, 
  onClose, 
  onConnect 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConnect: (appleId: string, password: string) => Promise<boolean>;
}) {
  const [appleId, setAppleId] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    if (!appleId || !appPassword) return;
    setConnecting(true);
    const success = await onConnect(appleId, appPassword);
    setConnecting(false);
    if (success) {
      setAppleId("");
      setAppPassword("");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border border-card-border">
        <DialogHeader>
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <img src={appleCalendarLogo} alt="Apple Calendar" className="w-10 h-10 object-contain" />
          </div>
          <DialogTitle className="text-center">Connect Apple Calendar</DialogTitle>
          <DialogDescription className="text-center">
            To connect your Apple Calendar, you'll need to use an App-Specific Password. 
            <a 
              href="https://support.apple.com/en-us/102654" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline ml-1"
            >
              Learn how to create one
            </a>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label htmlFor="apple-id">Apple ID (Email)</Label>
            <Input
              id="apple-id"
              type="email"
              value={appleId}
              onChange={(e) => setAppleId(e.target.value)}
              placeholder="your@icloud.com"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="app-password">App-Specific Password</Label>
            <Input
              id="app-password"
              type="password"
              value={appPassword}
              onChange={(e) => setAppPassword(e.target.value)}
              placeholder="xxxx-xxxx-xxxx-xxxx"
              className="mt-1"
            />
            <p className="text-xs text-text-muted mt-1">
              This is NOT your Apple ID password. Create an app-specific password at appleid.apple.com
            </p>
          </div>
          <Button 
            onClick={handleConnect} 
            disabled={!appleId || !appPassword || connecting}
            className="w-full"
          >
            {connecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              "Connect Apple Calendar"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Reusable Calendar Grid component
function CalendarGrid({
  currentDate,
  events,
  onDayClick,
}: {
  currentDate: Date;
  events: CalendarEvent[];
  onDayClick: (day: number) => void;
}) {
  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const calendarDays = Array.from({ length: 35 }, (_, i) => {
    const dayNumber = i - firstDay + 1;
    return dayNumber > 0 && dayNumber <= daysInMonth ? dayNumber : null;
  });

  const getEventsForDay = (day: number | null) => {
    if (!day) return [];
    return events.filter(event =>
      event.date === day &&
      event.month === currentDate.getMonth() &&
      event.year === currentDate.getFullYear()
    );
  };

  return (
    <div className="bg-card border border-card-border rounded-lg overflow-hidden">
      <div className="grid grid-cols-7 border-b border-card-border">
        {daysOfWeek.map((day) => (
          <div key={day} className="p-2 text-center text-xs font-medium text-text-muted bg-background-elevated">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {calendarDays.map((day, index) => {
          const dayEvents = getEventsForDay(day);
          const isToday = day === new Date().getDate() &&
            currentDate.getMonth() === new Date().getMonth() &&
            currentDate.getFullYear() === new Date().getFullYear();

          return (
            <div
              key={index}
              onClick={() => day && onDayClick(day)}
              className={`min-h-[80px] p-2 border-r border-b border-card-border last:border-r-0 hover:bg-background-elevated transition-colors ${day ? 'cursor-pointer' : ''}`}
            >
              {day && (
                <>
                  <div className={`text-sm font-medium mb-1 ${isToday ? 'bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center' : 'text-text-heading'}`}>
                    {day}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.map((event, eventIndex) => (
                      <div
                        key={eventIndex}
                        className={`text-xs px-1 py-0.5 rounded ${event.color} ${event.textColor} truncate`}
                      >
                        {event.isTeamEvent && event.ownerName ? `[${event.ownerName}] ` : ""}{event.title}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function CalendarView() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [isDailyViewOpen, setIsDailyViewOpen] = useState(false);
  const [isConnectDialogOpen, setIsConnectDialogOpen] = useState(false);
  const [isAppleModalOpen, setIsAppleModalOpen] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventTime, setNewEventTime] = useState("");
  const [newEventDescription, setNewEventDescription] = useState("");
  const [activeTab, setActiveTab] = useState("tasks");
  
  // Team shared events state
  const [teamEvents, setTeamEvents] = useState<CalendarEvent[]>([]);
  const [teamAdminsExist, setTeamAdminsExist] = useState(false);
  const [teamAdminAccessLevel, setTeamAdminAccessLevel] = useState<"view" | "edit">("view");
  const [teamAdminUserId, setTeamAdminUserId] = useState<string | null>(null);
  
  // Sync confirmation dialog state
  const [syncConfirmProvider, setSyncConfirmProvider] = useState<"google" | "apple" | null>(null);
  const [pendingAppleCredentials, setPendingAppleCredentials] = useState<{ appleId: string; password: string } | null>(null);
  
  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<CalendarEvent | null>(null);
  
  // Calendar visibility settings state
  const [showCalendarSettings, setShowCalendarSettings] = useState(false);
  const [shareCalendarsWithTeam, setShareCalendarsWithTeam] = useState(false);
  const [shareCalendarsAccessLevel, setShareCalendarsAccessLevel] = useState<"view" | "edit">("view");
  const [loadingSharePref, setLoadingSharePref] = useState(false);

  // Connected calendar events
  const { events: connectedEvents, addEvent: addConnectedEvent, deleteEvent: deleteConnectedEvent, refetch: refetchConnectedEvents } = useCalendarEvents();

  // Fetch calendar sharing preference
  useEffect(() => {
    if (!user) return;
    const fetchPref = async () => {
      const { data } = await supabase
        .from("agent_communication_preferences")
        .select("share_calendars_with_team, share_calendars_access_level")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setShareCalendarsWithTeam(data.share_calendars_with_team ?? false);
        setShareCalendarsAccessLevel((data as any).share_calendars_access_level ?? "view");
      }
    };
    fetchPref();
  }, [user]);

  // Fetch team admins who share their calendars and their events
  useEffect(() => {
    if (!user) return;
    const fetchTeamCalendarData = async () => {
      // Get team members who share calendars
      const { data: teamMembers } = await supabase
        .from("team_members")
        .select("team_id, user_id")
        .eq("status", "active");
      
      if (!teamMembers || teamMembers.length === 0) return;

      // Find teams I'm in
      const myTeamIds = teamMembers
        .filter(tm => tm.user_id === user.id)
        .map(tm => tm.team_id);
      
      if (myTeamIds.length === 0) return;

      // Get teammates
      const teammateIds = teamMembers
        .filter(tm => myTeamIds.includes(tm.team_id) && tm.user_id !== user.id)
        .map(tm => tm.user_id);

      if (teammateIds.length === 0) return;

      // Check which teammates share calendars
      const { data: prefs } = await supabase
        .from("agent_communication_preferences")
        .select("user_id, share_calendars_with_team, share_calendars_access_level")
        .in("user_id", teammateIds)
        .eq("share_calendars_with_team", true);

      if (!prefs || prefs.length === 0) {
        setTeamAdminsExist(false);
        setTeamEvents([]);
        setTeamAdminUserId(null);
        return;
      }

      // Use the first sharing admin's access level
      const firstPref = prefs[0] as any;
      setTeamAdminAccessLevel(firstPref.share_calendars_access_level ?? "view");
      setTeamAdminUserId(firstPref.user_id);

      setTeamAdminsExist(true);
      const sharingUserIds = prefs.map(p => p.user_id);

      // Get profiles for names
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", sharingUserIds);

      const admins = (profiles || []).map(p => ({
        userId: p.id,
        name: [p.first_name, p.last_name].filter(Boolean).join(" ") || "Team Member",
      }));

      // Fetch their calendar events  
      const { data: events } = await supabase
        .from("calendar_events")
        .select("*")
        .in("user_id", sharingUserIds)
        .order("event_date", { ascending: true });

      if (events) {
        const mapped: CalendarEvent[] = events.map(event => {
          const eventDate = new Date(event.event_date + "T00:00:00");
          const admin = admins.find(a => a.userId === event.user_id);
          return {
            id: event.id,
            date: eventDate.getDate(),
            month: eventDate.getMonth(),
            year: eventDate.getFullYear(),
            title: event.title,
            time: event.event_time || undefined,
            description: event.description || undefined,
            color: "bg-accent",
            textColor: "text-accent-foreground",
            isTeamEvent: true,
            ownerName: admin?.name || "Team Member",
            ownerUserId: event.user_id,
          };
        });
        setTeamEvents(mapped);
      }
    };

    fetchTeamCalendarData();
  }, [user]);

  const handleToggleCalendarSharing = async (checked: boolean) => {
    if (!user) return;
    setLoadingSharePref(true);
    const { error } = await supabase
      .from("agent_communication_preferences")
      .upsert(
        { user_id: user.id, share_calendars_with_team: checked, share_calendars_access_level: shareCalendarsAccessLevel } as any,
        { onConflict: "user_id" }
      );
    if (error) {
      toast({ title: "Error", description: "Failed to update calendar visibility setting.", variant: "destructive" });
    } else {
      setShareCalendarsWithTeam(checked);
      toast({
        title: checked ? "Calendars visible to team" : "Calendars set to private",
        description: checked
          ? "Your teammates can now view your connected calendars."
          : "Your connected calendars are now private.",
      });
    }
    setLoadingSharePref(false);
  };

  const handleToggleAccessLevel = async (level: "view" | "edit") => {
    if (!user) return;
    setLoadingSharePref(true);
    const { error } = await supabase
      .from("agent_communication_preferences")
      .upsert(
        { user_id: user.id, share_calendars_access_level: level } as any,
        { onConflict: "user_id" }
      );
    if (error) {
      toast({ title: "Error", description: "Failed to update access level.", variant: "destructive" });
    } else {
      setShareCalendarsAccessLevel(level);
      toast({
        title: "Access level updated",
        description: level === "edit"
          ? "Teammates can now add and manage events on your calendar."
          : "Teammates can only view your calendar.",
      });
    }
    setLoadingSharePref(false);
  };

  const { 
    connections, 
    loading: connectionsLoading, 
    connecting,
    isConnected, 
    getConnection,
    connectGoogle, 
    connectApple,
    disconnect 
  } = useCalendarConnections();
  
  const { 
    tasks, 
    bulkEnableExternalSync, 
    openTaskModal, 
    updateTask, 
    deleteTask 
  } = useTasks();
  
  const formatMonth = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };
  
  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  
  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };
  
  // Convert tasks with showOnCalendar to calendar events
  const taskEvents: CalendarEvent[] = useMemo(() => {
    return tasks
      .filter(task => {
        if (!task.showOnCalendar || !task.dueDate) return false;
        if (!user) return false;
        const isOwner = task.userId === user.id;
        const isAssigned = task.assigneeUserIds?.includes(user.id) ?? false;
        const hasNoAssignees = !task.assigneeUserIds || task.assigneeUserIds.length === 0;
        return isOwner || isAssigned || (hasNoAssignees && isOwner);
      })
      .map(task => {
        const [year, month, day] = task.dueDate!.split('-').map(Number);
        return {
          id: `task-${task.id}`,
          taskId: task.id,
          date: day,
          month: month - 1,
          year: year,
          title: task.title,
          time: task.dueTime || undefined,
          description: task.notes || undefined,
          color: task.priority === 'high' ? 'bg-destructive' : task.priority === 'medium' ? 'bg-accent-gold' : 'bg-primary',
          textColor: 'text-white',
          isTask: true,
        } as CalendarEvent;
      });
  }, [tasks, user]);

  // Connected calendar events mapped to CalendarEvent format
  const connectedCalendarEvents: CalendarEvent[] = useMemo(() => {
    return connectedEvents.map(event => {
      const d = event.date;
      return {
        id: event.id,
        date: d.getDate(),
        month: d.getMonth(),
        year: d.getFullYear(),
        title: event.title,
        time: event.time || undefined,
        description: event.description || undefined,
        color: "bg-secondary",
        textColor: "text-secondary-foreground",
      } as CalendarEvent;
    });
  }, [connectedEvents]);

  // Get events based on active tab
  const activeEvents = useMemo(() => {
    switch (activeTab) {
      case "tasks":
        return taskEvents;
      case "connected":
        return connectedCalendarEvents;
      case "admin":
        return teamEvents;
      default:
        return taskEvents;
    }
  }, [activeTab, taskEvents, connectedCalendarEvents, teamEvents]);

  const getEventsForDay = (day: number | null) => {
    if (!day) return [];
    return activeEvents.filter(event => 
      event.date === day && 
      event.month === currentDate.getMonth() && 
      event.year === currentDate.getFullYear()
    );
  };

  const handleDayClick = (day: number) => {
    setSelectedDay(day);
    setIsDailyViewOpen(true);
  };

  const handleAddEvent = async () => {
    if (!newEventTitle.trim() || !selectedDay) return;

    if (activeTab === "admin" && teamAdminUserId) {
      // Add event to admin's calendar
      const eventDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDay);
      const newEvent = {
        user_id: teamAdminUserId,
        title: newEventTitle,
        description: newEventDescription || null,
        event_date: eventDate.toISOString().split('T')[0],
        event_time: newEventTime ? newEventTime + ':00' : null,
        event_type: 'custom',
        source: 'manual',
        reminder_enabled: false,
      };
      const { data, error } = await supabase
        .from('calendar_events')
        .insert(newEvent)
        .select()
        .single();
      if (error) {
        toast({ title: "Error", description: "Failed to add event to admin calendar.", variant: "destructive" });
      } else if (data) {
        const mapped: CalendarEvent = {
          id: data.id,
          date: selectedDay,
          month: currentDate.getMonth(),
          year: currentDate.getFullYear(),
          title: data.title,
          time: data.event_time || undefined,
          description: data.description || undefined,
          color: "bg-accent",
          textColor: "text-accent-foreground",
          isTeamEvent: true,
          ownerName: "Admin",
          ownerUserId: teamAdminUserId,
        };
        setTeamEvents(prev => [...prev, mapped]);
        toast({ title: "Event added", description: `${newEventTitle} added to admin calendar.` });
      }
    } else if (activeTab === "connected") {
      // Add to connected calendar events (DB)
      const eventDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDay);
      await addConnectedEvent({
        date: eventDate,
        title: newEventTitle,
        time: newEventTime || undefined,
        description: newEventDescription || undefined,
        type: 'custom',
        reminderEnabled: false,
      });
    } else {
      // Clozze task calendar - add as a local event
      const newEvent: CalendarEvent = {
        id: Date.now().toString(),
        date: selectedDay,
        month: currentDate.getMonth(),
        year: currentDate.getFullYear(),
        title: newEventTitle,
        time: newEventTime || undefined,
        description: newEventDescription || undefined,
        color: "bg-primary",
        textColor: "text-primary-foreground",
      };
      setCalendarEvents([...calendarEvents, newEvent]);
      toast({
        title: "Event added",
        description: `${newEventTitle} has been added to ${formatMonth(currentDate)} ${selectedDay}`,
      });
    }

    setNewEventTitle("");
    setNewEventTime("");
    setNewEventDescription("");
  };

  const handleDeleteEvent = async (eventId: string) => {
    // Check if it's a team event
    const teamEvent = teamEvents.find(e => e.id === eventId);
    if (teamEvent) {
      const { error } = await supabase
        .from("calendar_events")
        .delete()
        .eq("id", eventId);
      if (!error) {
        setTeamEvents(prev => prev.filter(e => e.id !== eventId));
        toast({ title: "Event deleted", description: "The event has been removed." });
      }
      return;
    }
    if (activeTab === "connected") {
      await deleteConnectedEvent(eventId);
    } else {
      setCalendarEvents(calendarEvents.filter(event => event.id !== eventId));
      toast({ title: "Event deleted", description: "The event has been removed from your calendar" });
    }
  };

  // Handle clicking on an event
  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    if (event.isTask && event.taskId) {
      const task = tasks.find(t => t.id === event.taskId);
      if (task) {
        openTaskModal(task);
      }
    }
  };

  // Handle delete button click on an event
  const handleDeleteButtonClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    if (event.isTask) {
      setEventToDelete(event);
      setDeleteDialogOpen(true);
    } else {
      handleDeleteEvent(event.id);
    }
  };

  // Remove from calendar only
  const handleRemoveFromCalendarOnly = async () => {
    if (eventToDelete?.taskId) {
      await updateTask(eventToDelete.taskId, { showOnCalendar: false });
      toast({
        title: "Removed from calendar",
        description: "The task has been removed from the calendar but still exists in your task list.",
      });
    }
    setEventToDelete(null);
  };

  // Delete both the task and calendar event
  const handleDeleteTaskAndEvent = async () => {
    if (eventToDelete?.taskId) {
      const task = tasks.find(t => t.id === eventToDelete.taskId);
      if (task?.syncToExternalCalendar) {
        try {
          await supabase.functions.invoke('sync-google-calendar', {
            body: { action: 'delete_event', taskId: eventToDelete.taskId },
          });
        } catch (err) {
          console.error('[CalendarView] Error deleting Google Calendar event:', err);
        }
      }
      await deleteTask(eventToDelete.taskId);
    }
    setEventToDelete(null);
  };

  const formatDayWithMonth = (day: number) => {
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toLocaleDateString('en-US', { 
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    });
  };

  // Count tasks that would need syncing
  const tasksToSync = tasks.filter(t => t.showOnCalendar && !t.syncToExternalCalendar);
  
  const isCalendarAdminManaged = (provider: "google" | "apple") => {
    const conn = getConnection(provider);
    return !!conn && !conn.isOwned;
  };

  const handleGoogleConnect = async () => {
    if (isConnected("google")) {
      if (isCalendarAdminManaged("google")) {
        toast({ title: "Admin-managed calendar", description: "This calendar is managed by an admin." });
        return;
      }
      await disconnect("google");
    } else {
      if (tasksToSync.length > 0) {
        setSyncConfirmProvider("google");
      } else {
        await connectGoogle();
      }
    }
  };

  const handleAppleConnect = () => {
    if (isConnected("apple")) {
      if (isCalendarAdminManaged("apple")) {
        toast({ title: "Admin-managed calendar", description: "This calendar is managed by an admin." });
        return;
      }
      disconnect("apple");
    } else {
      setIsAppleModalOpen(true);
    }
  };
  
  const handleAppleCredentialsSubmit = useCallback(async (appleId: string, password: string): Promise<boolean> => {
    if (tasksToSync.length > 0) {
      setPendingAppleCredentials({ appleId, password });
      setSyncConfirmProvider("apple");
      return true;
    } else {
      return await connectApple(appleId, password);
    }
  }, [tasksToSync.length, connectApple]);
  
  const handleSyncConfirm = useCallback(async (syncExisting: boolean) => {
    const provider = syncConfirmProvider;
    setSyncConfirmProvider(null);
    if (!provider) return;
    if (syncExisting && tasksToSync.length > 0) {
      await bulkEnableExternalSync();
    }
    if (provider === "google") {
      await connectGoogle();
    } else if (provider === "apple" && pendingAppleCredentials) {
      await connectApple(pendingAppleCredentials.appleId, pendingAppleCredentials.password);
      setPendingAppleCredentials(null);
    }
  }, [syncConfirmProvider, tasksToSync.length, bulkEnableExternalSync, connectGoogle, connectApple, pendingAppleCredentials]);
  
  const handleSyncCancel = useCallback(() => {
    setSyncConfirmProvider(null);
    setPendingAppleCredentials(null);
  }, []);

  const allCalendarsConnected = isConnected("google") && isConnected("apple");
  const hasAnyConnection = isConnected("google") || isConnected("apple");

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-text-heading">Calendar</h2>
          <Dialog open={isConnectDialogOpen} onOpenChange={setIsConnectDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                size="sm" 
                variant={allCalendarsConnected ? "outline" : "default"}
                className={allCalendarsConnected 
                  ? "gap-2 text-sm border-success/50 bg-success/5 hover:bg-success/10 text-success hover:text-success" 
                  : "gap-2 text-sm relative bg-primary text-primary-foreground hover:bg-primary-hover transition-all duration-300 overflow-hidden group before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-r before:from-violet-500/20 before:via-fuchsia-500/20 before:to-cyan-500/20 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300 hover:backdrop-blur-md hover:border hover:border-white/20 hover:shadow-lg"
                }
              >
                {allCalendarsConnected ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Connected</span>
                  </>
                ) : (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-400/30 via-pink-400/30 to-cyan-400/30 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-500 skew-x-12"></div>
                    <Calendar className="h-4 w-4 relative z-10" />
                    <span className="relative z-10">Connect calendar</span>
                  </>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg bg-card border border-card-border shadow-elevated">
              <DialogHeader className="text-center pb-2">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Calendar className="h-7 w-7 text-primary" />
                </div>
                <DialogTitle className="text-xl font-semibold text-text-heading text-center">Connect Your Calendars</DialogTitle>
                <DialogDescription className="text-text-muted mt-2 text-center">
                  Stay organized by syncing your schedule, tasks, and important dates across your favorite calendar services.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-3 mt-6">
                {/* Google Calendar */}
                <button 
                  className={`group relative flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 text-left ${
                    isConnected("google") 
                      ? "border-success/50 bg-success/5" 
                      : "border-card-border bg-background hover:bg-primary/5 hover:border-primary/30"
                  } ${isCalendarAdminManaged("google") ? "cursor-default" : ""}`}
                  onClick={handleGoogleConnect}
                  disabled={connecting === "google"}
                >
                  <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0 group-hover:shadow-md transition-shadow">
                    <img src={googleCalendarLogo} alt="Google Calendar" className="w-8 h-8 object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-text-heading group-hover:text-primary transition-colors">Google Calendar</h3>
                    <p className="text-sm text-text-muted mt-0.5">
                      {isConnected("google") 
                        ? `Connected: ${getConnection("google")?.providerEmail || ""}` 
                        : "Sync with your Google account"}
                    </p>
                    {isCalendarAdminManaged("google") && (
                      <p className="text-xs text-accent-gold mt-1">Admin-managed</p>
                    )}
                  </div>
                  {connecting === "google" ? (
                    <Loader2 className="h-5 w-5 text-primary animate-spin" />
                  ) : isConnected("google") ? (
                    <Check className="h-5 w-5 text-success" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-text-muted group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  )}
                </button>

                {/* Apple Calendar */}
                <button 
                  className={`group relative flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 text-left ${
                    isConnected("apple") 
                      ? "border-success/50 bg-success/5" 
                      : "border-card-border bg-background hover:bg-primary/5 hover:border-primary/30"
                  } ${isCalendarAdminManaged("apple") ? "cursor-default" : ""}`}
                  onClick={handleAppleConnect}
                  disabled={connecting === "apple"}
                >
                  <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0 group-hover:shadow-md transition-shadow">
                    <img src={appleCalendarLogo} alt="Apple Calendar" className="w-8 h-8 object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-text-heading group-hover:text-primary transition-colors">Apple Calendar</h3>
                    <p className="text-sm text-text-muted mt-0.5">
                      {isConnected("apple") 
                        ? `Connected: ${getConnection("apple")?.providerEmail || ""}` 
                        : "Sync with iCloud Calendar"}
                    </p>
                    {isCalendarAdminManaged("apple") && (
                      <p className="text-xs text-accent-gold mt-1">Admin-managed</p>
                    )}
                  </div>
                  {connecting === "apple" ? (
                    <Loader2 className="h-5 w-5 text-primary animate-spin" />
                  ) : isConnected("apple") ? (
                    <Check className="h-5 w-5 text-success" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-text-muted group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  )}
                </button>
              </div>

              {/* Calendar Visibility Settings */}
              <div className="mt-4 border-t border-card-border pt-4">
                <button
                  onClick={() => setShowCalendarSettings(!showCalendarSettings)}
                  className="flex items-center gap-2 text-sm text-text-muted hover:text-text-heading transition-colors w-full"
                >
                  <Settings className="h-4 w-4" />
                  <span className="font-medium">Calendar Visibility Settings</span>
                  <ChevronRight className={`h-4 w-4 ml-auto transition-transform ${showCalendarSettings ? "rotate-90" : ""}`} />
                </button>
                
                {showCalendarSettings && (
                  <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-card-border space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <Label htmlFor="share-calendars" className="text-sm font-medium text-text-heading">
                          Allow teammates to view my calendars
                        </Label>
                        <p className="text-xs text-text-muted mt-0.5">
                          When enabled, your connected calendars will be visible to your team members.
                        </p>
                      </div>
                      <Switch
                        id="share-calendars"
                        checked={shareCalendarsWithTeam}
                        onCheckedChange={handleToggleCalendarSharing}
                        disabled={loadingSharePref}
                      />
                    </div>
                    {shareCalendarsWithTeam && (
                      <>
                        <div className="flex items-center justify-between gap-3 pt-2 border-t border-card-border">
                          <div className="flex-1">
                            <Label htmlFor="access-level" className="text-sm font-medium text-text-heading">
                              Allow teammates to add/edit events
                            </Label>
                            <p className="text-xs text-text-muted mt-0.5">
                              When enabled, teammates can create and manage events on your calendar.
                            </p>
                          </div>
                          <Switch
                            id="access-level"
                            checked={shareCalendarsAccessLevel === "edit"}
                            onCheckedChange={(checked) => handleToggleAccessLevel(checked ? "edit" : "view")}
                            disabled={loadingSharePref}
                          />
                        </div>
                        <p className="text-xs text-accent-gold flex items-center gap-1.5">
                          <Settings className="h-3 w-3" />
                          Your calendars are currently visible to teammates ({shareCalendarsAccessLevel === "edit" ? "can edit" : "view only"}).
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>

              <p className="text-xs text-text-subtle text-center mt-2">
                Your calendar data is securely synced and never shared without your consent.
              </p>
            </DialogContent>
          </Dialog>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handlePreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-text-heading min-w-[120px] text-center">
            {formatMonth(currentDate)}
          </span>
          <Button variant="ghost" size="sm" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar View Selector */}
      <div className="mb-4 space-y-2">
        <div className="inline-flex items-center rounded-lg border border-border bg-secondary/40 p-0.5 gap-0.5">
          {[
            { value: "tasks", label: "Clozze Task Calendar", icon: Calendar, disabled: false, hint: "" },
            { value: "connected", label: "Connected Calendar", icon: Unlink, disabled: !hasAnyConnection, hint: !hasAnyConnection ? "Not linked" : "" },
            ...(teamAdminsExist ? [{ value: "admin", label: "Admin Calendar", icon: Users, disabled: false, hint: "" }] : []),
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => !tab.disabled && setActiveTab(tab.value)}
                disabled={tab.disabled}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-150",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-text-muted hover:text-text-body hover:bg-secondary/80",
                  tab.disabled && "opacity-40 cursor-not-allowed"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
                {tab.hint && (
                  <span className="text-[10px] opacity-60">({tab.hint})</span>
                )}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-text-muted">
          {activeTab === "tasks" && "Centralized view of all your tasks by date."}
          {activeTab === "connected" && "Events from your connected calendar, including synced items."}
          {activeTab === "admin" && "Shared calendar from your workspace admin."}
        </p>
      </div>

      {/* Calendar Grid */}
      <CalendarGrid
        currentDate={currentDate}
        events={activeEvents}
        onDayClick={handleDayClick}
      />

      {/* Daily View Dialog */}
      <Dialog open={isDailyViewOpen} onOpenChange={setIsDailyViewOpen}>
        <DialogContent className="sm:max-w-2xl bg-card border border-card-border max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-text-heading">
              {selectedDay && formatDayWithMonth(selectedDay)}
            </DialogTitle>
            <DialogDescription className="text-text-muted">
              {activeTab === "tasks" ? "Tasks and shared team events for this day" : "Connected calendar events"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Events List */}
            <div>
              <h3 className="text-sm font-semibold text-text-heading mb-3">
                {activeTab === "tasks" ? "Tasks & Events" : "Events"}
              </h3>
              <div className="space-y-2">
                {selectedDay && getEventsForDay(selectedDay).length > 0 ? (
                  getEventsForDay(selectedDay).map((event) => (
                    <div
                      key={event.id}
                      onClick={(e) => handleEventClick(event, e)}
                      className={`flex items-start justify-between p-3 rounded-lg bg-background-elevated border border-card-border transition-all ${
                        event.isTask 
                          ? 'cursor-pointer hover:border-primary hover:bg-primary/5' 
                          : ''
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-3 h-3 rounded-full ${event.color}`}></div>
                          <h4 className="font-medium text-text-heading">{event.title}</h4>
                          {event.isTask && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Edit2 className="h-3 w-3" />
                              Task
                            </span>
                          )}
                          {event.isTeamEvent && event.ownerName && (
                            <span className="text-xs bg-accent/10 text-accent-foreground px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {event.ownerName}
                            </span>
                          )}
                        </div>
                        {event.time && (
                          <div className="flex items-center gap-1 text-sm text-text-muted ml-5">
                            <Clock className="h-3 w-3" />
                            <span>{formatTimeTo12Hour(event.time)}</span>
                          </div>
                        )}
                        {event.description && (
                          <p className="text-sm text-text-muted ml-5 mt-1">{event.description}</p>
                        )}
                        {event.isTask && (
                          <p className="text-xs text-primary ml-5 mt-2">Click to edit task</p>
                        )}
                      </div>
                      {/* On admin tab: hide actions if view-only, show both edit & delete if edit access */}
                      {activeTab === "admin" ? (
                        teamAdminAccessLevel === "edit" && (
                          <div className="flex items-center gap-1">
                            {!event.isTask && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Pre-fill the add form with this event's data for editing
                                  setNewEventTitle(event.title);
                                  setNewEventTime(event.time || "");
                                  setNewEventDescription(event.description || "");
                                  // Delete old, user will re-add with updated values
                                  handleDeleteEvent(event.id);
                                }}
                                className="text-primary hover:text-primary hover:bg-primary/10"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleDeleteButtonClick(event, e)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDeleteButtonClick(event, e)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-text-muted py-4 text-center">
                    {activeTab === "tasks" ? "No tasks scheduled for this day" : "No events for this day"}
                  </p>
                )}
              </div>
            </div>

            {/* Add New Event Form - hidden on admin tab if view-only */}
            {!(activeTab === "admin" && teamAdminAccessLevel === "view") && (
              <div className="border-t border-card-border pt-4">
                <h3 className="text-sm font-semibold text-text-heading mb-3 flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add New Event{activeTab === "admin" ? " (Admin Calendar)" : ""}
                </h3>
                <div className="space-y-4">

                  <div>
                    <Label htmlFor="event-title" className="text-text-heading">Event Title</Label>
                    <Input
                      id="event-title"
                      value={newEventTitle}
                      onChange={(e) => setNewEventTitle(e.target.value)}
                      placeholder="e.g., Client Meeting"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="event-time" className="text-text-heading">Time (optional)</Label>
                    <Input
                      id="event-time"
                      type="time"
                      value={newEventTime}
                      onChange={(e) => setNewEventTime(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="event-description" className="text-text-heading">Description (optional)</Label>
                    <Textarea
                      id="event-description"
                      value={newEventDescription}
                      onChange={(e) => setNewEventDescription(e.target.value)}
                      placeholder="Add event details..."
                      className="mt-1"
                      rows={3}
                    />
                  </div>

                  <Button
                    onClick={handleAddEvent}
                    disabled={!newEventTitle.trim()}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Event
                  </Button>
                </div>
              </div>
            )}
            {activeTab === "admin" && teamAdminAccessLevel === "view" && (
              <div className="border-t border-card-border pt-4">
                <p className="text-sm text-text-muted text-center py-2">
                  This is a view-only calendar. Contact your admin to request edit access.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Apple Calendar Modal */}
      <AppleCalendarModal 
        isOpen={isAppleModalOpen}
        onClose={() => setIsAppleModalOpen(false)}
        onConnect={handleAppleCredentialsSubmit}
      />
      
      {/* Sync Confirmation Dialog */}
      <CalendarSyncConfirmDialog
        open={syncConfirmProvider !== null}
        onOpenChange={(open) => {
          if (!open) handleSyncCancel();
        }}
        provider={syncConfirmProvider || "google"}
        onConfirm={handleSyncConfirm}
        onCancel={handleSyncCancel}
      />
      
      {/* Delete Confirmation Dialog */}
      <CalendarEventDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        eventTitle={eventToDelete?.title || ""}
        isTaskEvent={eventToDelete?.isTask || false}
        onDeleteEventOnly={() => handleDeleteEvent(eventToDelete?.id || "")}
        onRemoveFromCalendarOnly={handleRemoveFromCalendarOnly}
        onDeleteBoth={handleDeleteTaskAndEvent}
      />
    </div>
  );
}
