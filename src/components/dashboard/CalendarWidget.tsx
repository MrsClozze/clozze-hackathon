import { useState } from "react";
import { Calendar, Clock, Settings } from "lucide-react";
import BentoCard from "./BentoCard";
import { Button } from "@/components/ui/button";

const todayEvents = [
  {
    id: 1,
    title: "Property Showing",
    time: "2:00 PM",
    address: "123 Maple Street",
    type: "showing",
  },
  {
    id: 2,
    title: "Client Meeting",
    time: "4:30 PM",
    client: "Sarah Johnson",
    type: "meeting",
  },
  {
    id: 3,
    title: "Inspection Follow-up",
    time: "6:00 PM",
    address: "456 Oak Avenue",
    type: "followup",
  },
];

export default function CalendarWidget() {
  const [currentDate] = useState(new Date());

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <BentoCard
      title="Calendar"
      subtitle={formatDate(currentDate)}
      action={
        <Button variant="ghost" size="sm">
          <Settings className="h-4 w-4" />
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Mini Calendar Display */}
        <div className="flex items-center justify-center p-4 bg-background-elevated rounded-lg">
          <div className="text-center">
            <div className="text-3xl font-bold text-accent-gold mb-1">
              {currentDate.getDate()}
            </div>
            <div className="text-sm text-text-muted">
              {currentDate.toLocaleDateString('en-US', { month: 'short' })}
            </div>
          </div>
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
                className="flex items-start gap-3 p-3 rounded-lg bg-background-elevated border border-card-border hover:border-accent-gold/30 transition-all duration-200"
              >
                <div className="flex-shrink-0 w-16 text-sm font-medium text-accent-gold">
                  {event.time}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-heading truncate">
                    {event.title}
                  </p>
                  <p className="text-xs text-text-muted">
                    {'address' in event ? event.address : event.client}
                  </p>
                </div>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-2 ${
                  event.type === 'showing' ? 'bg-success' :
                  event.type === 'meeting' ? 'bg-warning' : 'bg-accent-gold'
                }`} />
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-text-muted">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
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
  );
}