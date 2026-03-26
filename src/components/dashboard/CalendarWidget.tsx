import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, Plus, X, Pencil } from "lucide-react";
import BentoCard from "./BentoCard";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useCalendarEvents, CalendarEvent } from "@/hooks/useCalendarEvents";
import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarWidget() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [isDailyViewOpen, setIsDailyViewOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  
  // Form state
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventTime, setNewEventTime] = useState("");
  const [newEventDescription, setNewEventDescription] = useState("");
  const [newEventAddress, setNewEventAddress] = useState("");
  const [newEventClient, setNewEventClient] = useState("");
  const [reminderEnabled, setReminderEnabled] = useState(false);

  const {
    events,
    loading,
    addEvent,
    updateEvent,
    deleteEvent,
    getEventsForDate,
    getTodayEvents,
  } = useCalendarEvents();

  // Update current date every minute to keep it accurate
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'long',
      year: 'numeric'
    });
  };

  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setIsDailyViewOpen(true);
      resetForm();
    }
  };

  const resetForm = () => {
    setNewEventTitle("");
    setNewEventTime("");
    setNewEventDescription("");
    setNewEventAddress("");
    setNewEventClient("");
    setReminderEnabled(false);
    setIsEditMode(false);
    setEditingEvent(null);
  };

  const handleAddEvent = async () => {
    if (!newEventTitle.trim() || !selectedDate) return;

    const success = await addEvent({
      date: selectedDate,
      title: newEventTitle,
      time: newEventTime,
      description: newEventDescription,
      address: newEventAddress,
      client: newEventClient,
      type: "custom",
      reminderEnabled,
    });

    if (success) {
      resetForm();
    }
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setIsEditMode(true);
    setEditingEvent(event);
    setNewEventTitle(event.title);
    setNewEventTime(event.time || "");
    setNewEventDescription(event.description || "");
    setNewEventAddress(event.address || "");
    setNewEventClient(event.client || "");
    setReminderEnabled(event.reminderEnabled || false);
  };

  const handleUpdateEvent = async () => {
    if (!editingEvent || !newEventTitle.trim()) return;

    const success = await updateEvent(editingEvent.id, {
      title: newEventTitle,
      time: newEventTime,
      description: newEventDescription,
      address: newEventAddress,
      client: newEventClient,
      reminderEnabled,
    });

    if (success) {
      resetForm();
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    await deleteEvent(eventId);
  };

  const todayEvents = getTodayEvents();

  if (loading) {
    return (
      <BentoCard title="Calendar" subtitle="Loading...">
        <div className="space-y-4">
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      </BentoCard>
    );
  }

  return (
    <>
      <BentoCard
        title="Calendar"
        subtitle={formatDate(currentDate)}
        action={
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={handlePreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Calendar Grid */}
          <div className="bg-background-elevated rounded-lg p-2">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              month={currentDate}
              onMonthChange={setCurrentDate}
              className="w-full pointer-events-auto"
              modifiers={{
                hasEvents: events.map(e => e.date),
              }}
              modifiersStyles={{
                hasEvents: {
                  fontWeight: 'bold',
                  textDecoration: 'underline',
                  textDecorationColor: 'hsl(var(--accent-gold))',
                }
              }}
            />
          </div>

          {/* Today's Events */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-text-heading flex items-center gap-2">
              <Clock className="h-4 w-4 text-accent-gold" />
              Today's Schedule
            </h4>
            
            {todayEvents.length > 0 ? (
              todayEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-background-elevated border border-card-border hover:border-accent-gold/30 transition-all duration-200 cursor-pointer"
                  onClick={() => handleDateSelect(event.date)}
                >
                  <div className="flex-shrink-0 w-16 text-sm font-medium text-accent-gold">
                    {event.time || "All day"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-heading truncate">
                      {event.title}
                    </p>
                    {event.address && (
                      <p className="text-xs text-text-muted">{event.address}</p>
                    )}
                    {event.client && (
                      <p className="text-xs text-text-muted">{event.client}</p>
                    )}
                  </div>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-2 ${
                    event.type === 'showing' ? 'bg-success' :
                    event.type === 'meeting' ? 'bg-warning' : 'bg-accent-gold'
                  }`} />
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-text-muted">
                <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No events scheduled for today</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3"
                  onClick={() => handleDateSelect(new Date())}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Event
                </Button>
              </div>
            )}
          </div>
        </div>
      </BentoCard>

      {/* Daily View Dialog */}
      <Dialog open={isDailyViewOpen} onOpenChange={(open) => {
        setIsDailyViewOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="sm:max-w-2xl bg-card border border-card-border max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-text-heading">
              {selectedDate && selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric',
                year: 'numeric'
              })}
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
                {selectedDate && getEventsForDate(selectedDate).length > 0 ? (
                  getEventsForDate(selectedDate).map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start justify-between p-3 rounded-lg bg-background-elevated border border-card-border"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-3 h-3 rounded-full ${
                            event.type === 'showing' ? 'bg-success' :
                            event.type === 'meeting' ? 'bg-warning' : 'bg-accent-gold'
                          }`}></div>
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
                        {event.address && (
                          <p className="text-sm text-text-muted ml-5 mt-1">📍 {event.address}</p>
                        )}
                        {event.client && (
                          <p className="text-sm text-text-muted ml-5 mt-1">👤 {event.client}</p>
                        )}
                        {event.reminderEnabled && (
                          <p className="text-xs text-accent-gold ml-5 mt-1">🔔 Reminder enabled</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditEvent(event)}
                          className="text-text-muted hover:text-text-heading"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteEvent(event.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-text-muted py-4 text-center">No events scheduled for this day</p>
                )}
              </div>
            </div>

            {/* Add/Edit Event Form */}
            <div className="border-t border-card-border pt-4">
              <h3 className="text-sm font-semibold text-text-heading mb-3 flex items-center gap-2">
                {isEditMode ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {isEditMode ? "Edit Event" : "Add New Event"}
              </h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="event-title" className="text-text-heading">Event Title *</Label>
                  <Input
                    id="event-title"
                    value={newEventTitle}
                    onChange={(e) => setNewEventTitle(e.target.value)}
                    placeholder="e.g., Client Meeting"
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="event-time" className="text-text-heading">Time</Label>
                    <Input
                      id="event-time"
                      type="time"
                      value={newEventTime}
                      onChange={(e) => setNewEventTime(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="event-client" className="text-text-heading">Client Name</Label>
                    <Input
                      id="event-client"
                      value={newEventClient}
                      onChange={(e) => setNewEventClient(e.target.value)}
                      placeholder="e.g., Sarah Johnson"
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="event-address" className="text-text-heading">Address</Label>
                  <Input
                    id="event-address"
                    value={newEventAddress}
                    onChange={(e) => setNewEventAddress(e.target.value)}
                    placeholder="e.g., 123 Main Street"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="event-description" className="text-text-heading">Description</Label>
                  <Textarea
                    id="event-description"
                    value={newEventDescription}
                    onChange={(e) => setNewEventDescription(e.target.value)}
                    placeholder="Add event details..."
                    className="mt-1"
                    rows={2}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-background-elevated border border-card-border">
                  <div>
                    <Label htmlFor="reminder-toggle" className="text-text-heading">Email Reminder</Label>
                    <p className="text-xs text-text-muted">Get notified before this event</p>
                  </div>
                  <Switch
                    id="reminder-toggle"
                    checked={reminderEnabled}
                    onCheckedChange={setReminderEnabled}
                  />
                </div>
                <div className="flex gap-2">
                  {isEditMode && (
                    <Button
                      variant="outline"
                      onClick={resetForm}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  )}
                  <Button
                    onClick={isEditMode ? handleUpdateEvent : handleAddEvent}
                    disabled={!newEventTitle.trim()}
                    className="flex-1"
                  >
                    {isEditMode ? (
                      <>
                        <Pencil className="h-4 w-4 mr-2" />
                        Update Event
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Event
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
