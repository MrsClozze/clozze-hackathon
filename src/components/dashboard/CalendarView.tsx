import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar, Mail, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const calendarEvents = [
  { date: 1, title: "Listing Appt", color: "bg-blue-500", textColor: "text-white" },
  { date: 2, title: "Open House", color: "bg-green-500", textColor: "text-white" },
  { date: 3, title: "Client Meeting", color: "bg-blue-500", textColor: "text-white" },
  { date: 5, title: "Property Tour", color: "bg-purple-500", textColor: "text-white" },
  { date: 8, title: "Contract Review", color: "bg-blue-500", textColor: "text-white" },
  { date: 16, title: "Listing Appt", color: "bg-blue-500", textColor: "text-white" },
  { date: 19, title: "Closing", color: "bg-red-500", textColor: "text-white" },
];

const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export default function CalendarView() {
  const [currentDate] = useState(new Date(2025, 8)); // September 2025
  
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };
  
  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };
  
  const formatMonth = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-text-heading">Calendar</h2>
          <Dialog>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2 text-sm"
              >
                <Calendar className="h-4 w-4" />
                Connect calendar
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-card border border-card-border">
              <DialogHeader>
                <DialogTitle className="text-text-heading">Connect Calendar</DialogTitle>
                <DialogDescription className="text-text-muted">
                  Choose a calendar service to sync your events with Clozze.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-3 mt-4">
                <Button 
                  variant="outline" 
                  className="flex items-center gap-3 justify-start h-12 px-4"
                >
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Mail className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-medium">Google Calendar</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="flex items-center gap-3 justify-start h-12 px-4"
                >
                  <div className="w-8 h-8 bg-gray-600 rounded-lg flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-medium">iCalendar</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="flex items-center gap-3 justify-start h-12 px-4"
                >
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Globe className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-medium">Outlook</span>
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-text-heading min-w-[120px] text-center">
            {formatMonth(currentDate)}
          </span>
          <Button variant="ghost" size="sm">
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
                className="min-h-[80px] p-2 border-r border-b border-card-border last:border-r-0 hover:bg-background-elevated transition-colors"
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
    </div>
  );
}