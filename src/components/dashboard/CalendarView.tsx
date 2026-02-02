import { useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Calendar, Plus, Clock, X, Check, Loader2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useCalendarConnections } from "@/hooks/useCalendarConnections";
import { CalendarSyncConfirmDialog } from "@/components/integrations/CalendarSyncConfirmDialog";
import { useTasks } from "@/contexts/TasksContext";
import googleCalendarLogo from "@/assets/google-calendar-logo.png";
import appleCalendarLogo from "@/assets/apple-calendar-logo.png";

interface CalendarEvent {
  id: string;
  date: number;
  title: string;
  time?: string;
  description?: string;
  color: string;
  textColor: string;
}

const initialEvents: CalendarEvent[] = [];

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

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(initialEvents);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [isDailyViewOpen, setIsDailyViewOpen] = useState(false);
  const [isConnectDialogOpen, setIsConnectDialogOpen] = useState(false);
  const [isAppleModalOpen, setIsAppleModalOpen] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventTime, setNewEventTime] = useState("");
  const [newEventDescription, setNewEventDescription] = useState("");
  
  // Sync confirmation dialog state
  const [syncConfirmProvider, setSyncConfirmProvider] = useState<"google" | "apple" | null>(null);
  const [pendingAppleCredentials, setPendingAppleCredentials] = useState<{ appleId: string; password: string } | null>(null);

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
  
  const { tasks, bulkEnableExternalSync } = useTasks();
  
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };
  
  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };
  
  const formatMonth = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };
  
  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  
  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };
  
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const calendarDays = Array.from({ length: 35 }, (_, i) => {
    const dayNumber = i - firstDay + 1;
    return dayNumber > 0 && dayNumber <= daysInMonth ? dayNumber : null;
  });
  
  const getEventsForDay = (day: number | null) => {
    if (!day) return [];
    return calendarEvents.filter(event => event.date === day);
  };

  const handleDayClick = (day: number | null) => {
    if (day) {
      setSelectedDay(day);
      setIsDailyViewOpen(true);
    }
  };

  const handleAddEvent = () => {
    if (!newEventTitle.trim() || !selectedDay) return;

    const newEvent: CalendarEvent = {
      id: Date.now().toString(),
      date: selectedDay,
      title: newEventTitle,
      time: newEventTime,
      description: newEventDescription,
      color: "bg-primary",
      textColor: "text-primary-foreground",
    };

    setCalendarEvents([...calendarEvents, newEvent]);
    setNewEventTitle("");
    setNewEventTime("");
    setNewEventDescription("");
    
    toast({
      title: "Event added",
      description: `${newEventTitle} has been added to ${formatMonth(currentDate)} ${selectedDay}`,
    });
  };

  const handleDeleteEvent = (eventId: string) => {
    setCalendarEvents(calendarEvents.filter(event => event.id !== eventId));
    toast({
      title: "Event deleted",
      description: "The event has been removed from your calendar",
    });
  };

  const formatDayWithMonth = (day: number) => {
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Count tasks that would need syncing
  const tasksToSync = tasks.filter(t => t.showOnCalendar && !t.syncToExternalCalendar);
  
  const handleGoogleConnect = async () => {
    if (isConnected("google")) {
      await disconnect("google");
    } else {
      // Check if there are existing calendar tasks - show confirmation dialog
      if (tasksToSync.length > 0) {
        setSyncConfirmProvider("google");
      } else {
        await connectGoogle();
      }
    }
  };

  const handleAppleConnect = () => {
    if (isConnected("apple")) {
      disconnect("apple");
    } else {
      setIsAppleModalOpen(true);
    }
  };
  
  // Called when Apple modal submits credentials - check for existing tasks first
  const handleAppleCredentialsSubmit = useCallback(async (appleId: string, password: string): Promise<boolean> => {
    if (tasksToSync.length > 0) {
      // Store credentials and show confirmation dialog
      setPendingAppleCredentials({ appleId, password });
      setSyncConfirmProvider("apple");
      return true; // Return true to close the credentials modal
    } else {
      // No existing tasks, connect directly
      return await connectApple(appleId, password);
    }
  }, [tasksToSync.length, connectApple]);
  
  // Called when user confirms or declines sync in the confirmation dialog
  const handleSyncConfirm = useCallback(async (syncExisting: boolean) => {
    const provider = syncConfirmProvider;
    setSyncConfirmProvider(null);
    
    if (!provider) return;
    
    // First, sync existing tasks if user chose "Yes"
    if (syncExisting && tasksToSync.length > 0) {
      await bulkEnableExternalSync();
    }
    
    // Then proceed with the actual calendar connection
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

  const connectedCount = connections.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-text-heading">Calendar</h2>
          <Dialog open={isConnectDialogOpen} onOpenChange={setIsConnectDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                size="sm" 
                className="gap-2 text-sm relative bg-primary text-primary-foreground hover:bg-primary-hover transition-all duration-300 overflow-hidden group before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-r before:from-violet-500/20 before:via-fuchsia-500/20 before:to-cyan-500/20 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300 hover:backdrop-blur-md hover:border hover:border-white/20 hover:shadow-lg"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400/30 via-pink-400/30 to-cyan-400/30 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-500 skew-x-12"></div>
                <Calendar className="h-4 w-4 relative z-10" />
                <span className="relative z-10">
                  {connectedCount > 0 ? `${connectedCount} connected` : "Connect calendar"}
                </span>
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
                  }`}
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
                  }`}
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

              {connectedCount > 0 && (
                <p className="text-xs text-text-subtle text-center mt-4">
                  Click a connected calendar to disconnect it.
                </p>
              )}

              <p className="text-xs text-text-subtle text-center mt-2">
                Your calendar data is securely synced and never shared.
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

      <div className="bg-card border border-card-border rounded-lg overflow-hidden">
        {/* Calendar Header */}
        <div className="grid grid-cols-7 border-b border-card-border">
          {daysOfWeek.map((day) => (
            <div key={day} className="p-2 text-center text-xs font-medium text-text-muted bg-background-elevated">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => {
            const events = getEventsForDay(day);
            const isToday = day === new Date().getDate() && 
              currentDate.getMonth() === new Date().getMonth() && 
              currentDate.getFullYear() === new Date().getFullYear();
            
            return (
              <div
                key={index}
                onClick={() => handleDayClick(day)}
                className={`min-h-[80px] p-2 border-r border-b border-card-border last:border-r-0 hover:bg-background-elevated transition-colors ${day ? 'cursor-pointer' : ''}`}
              >
                {day && (
                  <>
                    <div className={`text-sm font-medium mb-1 ${isToday ? 'bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center' : 'text-text-heading'}`}>
                      {day}
                    </div>
                    <div className="space-y-1">
                      {events.map((event, eventIndex) => (
                        <div
                          key={eventIndex}
                          className={`text-xs px-1 py-0.5 rounded ${event.color} ${event.textColor} truncate`}
                        >
                          {event.title}
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

      {/* Daily View Dialog */}
      <Dialog open={isDailyViewOpen} onOpenChange={setIsDailyViewOpen}>
        <DialogContent className="sm:max-w-2xl bg-card border border-card-border max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-text-heading">
              {selectedDay && formatDayWithMonth(selectedDay)}
            </DialogTitle>
            <DialogDescription className="text-text-muted">
              View and manage events for this day
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Events List */}
            <div>
              <h3 className="text-sm font-semibold text-text-heading mb-3">Events</h3>
              <div className="space-y-2">
                {selectedDay && getEventsForDay(selectedDay).length > 0 ? (
                  getEventsForDay(selectedDay).map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start justify-between p-3 rounded-lg bg-background-elevated border border-card-border"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-3 h-3 rounded-full ${event.color}`}></div>
                          <h4 className="font-medium text-text-heading">{event.title}</h4>
                        </div>
                        {event.time && (
                          <div className="flex items-center gap-1 text-sm text-text-muted ml-5">
                            <Clock className="h-3 w-3" />
                            <span>{event.time}</span>
                          </div>
                        )}
                        {event.description && (
                          <p className="text-sm text-text-muted ml-5 mt-1">{event.description}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteEvent(event.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-text-muted py-4 text-center">No events scheduled for this day</p>
                )}
              </div>
            </div>

            {/* Add New Event Form */}
            <div className="border-t border-card-border pt-4">
              <h3 className="text-sm font-semibold text-text-heading mb-3 flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add New Event
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
          </div>
        </DialogContent>
      </Dialog>

      {/* Apple Calendar Modal */}
      <AppleCalendarModal 
        isOpen={isAppleModalOpen}
        onClose={() => setIsAppleModalOpen(false)}
        onConnect={handleAppleCredentialsSubmit}
      />
      
      {/* Sync Confirmation Dialog - shown before connecting */}
      <CalendarSyncConfirmDialog
        open={syncConfirmProvider !== null}
        onOpenChange={(open) => {
          if (!open) {
            handleSyncCancel();
          }
        }}
        provider={syncConfirmProvider || "google"}
        onConfirm={handleSyncConfirm}
        onCancel={handleSyncCancel}
      />
    </div>
  );
}
