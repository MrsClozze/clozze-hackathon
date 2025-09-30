import { useState } from "react";
import { Calendar as CalendarIcon, Clock, Settings, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
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
import { toast } from "@/hooks/use-toast";

interface CalendarEvent {
  id: string;
  date: Date;
  title: string;
  time?: string;
  description?: string;
  address?: string;
  client?: string;
  type: string;
}

const initialEvents: CalendarEvent[] = [
  {
    id: "1",
    date: new Date(2025, 8, 15),
    title: "Property Showing",
    time: "2:00 PM",
    address: "123 Maple Street",
    type: "showing",
  },
  {
    id: "2",
    date: new Date(2025, 8, 15),
    title: "Client Meeting",
    time: "4:30 PM",
    client: "Sarah Johnson",
    type: "meeting",
  },
  {
    id: "3",
    date: new Date(2025, 8, 15),
    title: "Inspection Follow-up",
    time: "6:00 PM",
    address: "456 Oak Avenue",
    type: "followup",
  },
];

export default function CalendarWidget() {
  const [currentDate, setCurrentDate] = useState(new Date(2025, 8, 15));
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [isDailyViewOpen, setIsDailyViewOpen] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(initialEvents);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventTime, setNewEventTime] = useState("");
  const [newEventDescription, setNewEventDescription] = useState("");

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
    }
  };

  const getEventsForDate = (date: Date) => {
    return calendarEvents.filter(event => 
      event.date.toDateString() === date.toDateString()
    );
  };

  const handleAddEvent = () => {
    if (!newEventTitle.trim() || !selectedDate) return;

    const newEvent: CalendarEvent = {
      id: Date.now().toString(),
      date: selectedDate,
      title: newEventTitle,
      time: newEventTime,
      description: newEventDescription,
      type: "custom",
    };

    setCalendarEvents([...calendarEvents, newEvent]);
    setNewEventTitle("");
    setNewEventTime("");
    setNewEventDescription("");
    
    toast({
      title: "Event added",
      description: `${newEventTitle} has been added to your calendar`,
    });
  };

  const handleDeleteEvent = (eventId: string) => {
    setCalendarEvents(calendarEvents.filter(event => event.id !== eventId));
    toast({
      title: "Event deleted",
      description: "The event has been removed from your calendar",
    });
  };

  const getTodayEvents = () => {
    const today = new Date();
    return calendarEvents.filter(event => 
      event.date.toDateString() === today.toDateString()
    );
  };

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
              className="w-full"
            />
          </div>

          {/* Today's Events */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-text-heading flex items-center gap-2">
              <Clock className="h-4 w-4 text-accent-gold" />
              Today's Schedule
            </h4>
            
            {getTodayEvents().length > 0 ? (
              getTodayEvents().map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-background-elevated border border-card-border hover:border-accent-gold/30 transition-all duration-200 cursor-pointer"
                  onClick={() => handleDateSelect(event.date)}
                >
                  <div className="flex-shrink-0 w-16 text-sm font-medium text-accent-gold">
                    {event.time}
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
              </div>
            )}
          </div>

          {/* Sync Options */}
          <div className="pt-4 border-t border-card-border">
            <p className="text-xs text-text-subtle mb-2">Sync with external calendar:</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 text-xs">
                Google
              </Button>
              <Button variant="outline" size="sm" className="flex-1 text-xs">
                Apple
              </Button>
              <Button variant="outline" size="sm" className="flex-1 text-xs">
                Outlook
              </Button>
            </div>
          </div>
        </div>
      </BentoCard>

      {/* Daily View Dialog */}
      <Dialog open={isDailyViewOpen} onOpenChange={setIsDailyViewOpen}>
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
                          <p className="text-sm text-text-muted ml-5 mt-1">{event.address}</p>
                        )}
                        {event.client && (
                          <p className="text-sm text-text-muted ml-5 mt-1">{event.client}</p>
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
    </>
  );
}