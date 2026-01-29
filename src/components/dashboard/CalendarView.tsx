import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar, Globe, Plus, Clock, X } from "lucide-react";
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
import googleCalendarLogo from "@/assets/google-calendar-logo.png";
import appleCalendarLogo from "@/assets/apple-calendar-logo.png";
import outlookLogo from "@/assets/outlook-logo.png";

interface CalendarEvent {
  id: string;
  date: number;
  title: string;
  time?: string;
  description?: string;
  color: string;
  textColor: string;
}

const initialEvents: CalendarEvent[] = [
  { id: "1", date: 1, title: "Listing Appt", time: "10:00 AM", color: "bg-blue-500", textColor: "text-white" },
  { id: "2", date: 2, title: "Open House", time: "2:00 PM", color: "bg-green-500", textColor: "text-white" },
  { id: "3", date: 3, title: "Client Meeting", time: "11:00 AM", color: "bg-blue-500", textColor: "text-white" },
  { id: "4", date: 5, title: "Property Tour", time: "3:00 PM", color: "bg-purple-500", textColor: "text-white" },
  { id: "5", date: 8, title: "Contract Review", time: "9:00 AM", color: "bg-blue-500", textColor: "text-white" },
  { id: "6", date: 16, title: "Listing Appt", time: "1:00 PM", color: "bg-blue-500", textColor: "text-white" },
  { id: "7", date: 19, title: "Closing", time: "4:00 PM", color: "bg-red-500", textColor: "text-white" },
];

const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date(2025, 8)); // September 2025
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(initialEvents);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [isDailyViewOpen, setIsDailyViewOpen] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventTime, setNewEventTime] = useState("");
  const [newEventDescription, setNewEventDescription] = useState("");
  
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
      color: "bg-blue-500",
      textColor: "text-white",
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-text-heading">Calendar</h2>
          <Dialog>
            <DialogTrigger asChild>
              <Button 
                size="sm" 
                className="gap-2 text-sm relative bg-primary text-primary-foreground hover:bg-primary-hover transition-all duration-300 overflow-hidden group before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-r before:from-violet-500/20 before:via-fuchsia-500/20 before:to-cyan-500/20 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300 hover:backdrop-blur-md hover:border hover:border-white/20 hover:shadow-lg"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400/30 via-pink-400/30 to-cyan-400/30 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-500 skew-x-12"></div>
                <Calendar className="h-4 w-4 relative z-10" />
                <span className="relative z-10">Connect calendar</span>
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
                  className="group relative flex items-center gap-4 p-4 rounded-xl border border-card-border bg-background hover:bg-primary/5 hover:border-primary/30 transition-all duration-300 text-left"
                  onClick={() => toast({ title: "Coming soon", description: "Google Calendar integration will be available soon!" })}
                >
                  <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0 group-hover:shadow-md transition-shadow">
                    <img src={googleCalendarLogo} alt="Google Calendar" className="w-8 h-8 object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-text-heading group-hover:text-primary transition-colors">Google Calendar</h3>
                    <p className="text-sm text-text-muted mt-0.5">Sync with your Google account</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-text-muted group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </button>

                {/* Apple Calendar */}
                <button 
                  className="group relative flex items-center gap-4 p-4 rounded-xl border border-card-border bg-background hover:bg-primary/5 hover:border-primary/30 transition-all duration-300 text-left"
                  onClick={() => toast({ title: "Coming soon", description: "Apple Calendar integration will be available soon!" })}
                >
                  <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0 group-hover:shadow-md transition-shadow">
                    <img src={appleCalendarLogo} alt="Apple Calendar" className="w-8 h-8 object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-text-heading group-hover:text-primary transition-colors">Apple Calendar</h3>
                    <p className="text-sm text-text-muted mt-0.5">Sync with iCloud Calendar</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-text-muted group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </button>

                {/* Outlook Calendar */}
                <button 
                  className="group relative flex items-center gap-4 p-4 rounded-xl border border-card-border bg-background hover:bg-primary/5 hover:border-primary/30 transition-all duration-300 text-left"
                  onClick={() => toast({ title: "Coming soon", description: "Outlook Calendar integration will be available soon!" })}
                >
                  <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0 group-hover:shadow-md transition-shadow">
                    <img src={outlookLogo} alt="Outlook Calendar" className="w-8 h-8 object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-text-heading group-hover:text-primary transition-colors">Outlook Calendar</h3>
                    <p className="text-sm text-text-muted mt-0.5">Sync with Microsoft 365</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-text-muted group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </button>
              </div>

              <p className="text-xs text-text-subtle text-center mt-6">
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
            return (
              <div
                key={index}
                onClick={() => handleDayClick(day)}
                className={`min-h-[80px] p-2 border-r border-b border-card-border last:border-r-0 hover:bg-background-elevated transition-colors ${day ? 'cursor-pointer' : ''}`}
              >
                {day && (
                  <>
                    <div className="text-sm font-medium text-text-heading mb-1">
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
    </div>
  );
}