import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import googleCalendarLogo from "@/assets/google-calendar-logo.png";

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
                size="sm" 
                className="gap-2 text-sm relative bg-primary text-primary-foreground hover:bg-primary-hover transition-all duration-300 overflow-hidden group before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-r before:from-violet-500/20 before:via-fuchsia-500/20 before:to-cyan-500/20 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300 hover:backdrop-blur-md hover:border hover:border-white/20 hover:shadow-lg"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400/30 via-pink-400/30 to-cyan-400/30 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-500 skew-x-12"></div>
                <Calendar className="h-4 w-4 relative z-10" />
                <span className="relative z-10">Connect calendar</span>
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
                  className="flex items-center gap-3 justify-start h-12 px-4 hover:bg-accent-gold/5 hover:border-accent-gold/30 transition-all duration-200"
                >
                  <div className="w-8 h-8 flex items-center justify-center">
                    <img src={googleCalendarLogo} alt="Google Calendar" className="w-8 h-8 object-contain" />
                  </div>
                  <span className="font-medium">Google Calendar</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="flex items-center gap-3 justify-start h-12 px-4 hover:bg-accent-gold/5 hover:border-accent-gold/30 transition-all duration-200"
                >
                  <div className="w-8 h-8 bg-gray-600 rounded-lg flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-medium">iCalendar</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="flex items-center gap-3 justify-start h-12 px-4 hover:bg-accent-gold/5 hover:border-accent-gold/30 transition-all duration-200"
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