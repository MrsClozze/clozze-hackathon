import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CalendarEvent {
  id: string;
  date: Date;
  title: string;
  time?: string;
  description?: string;
  address?: string;
  client?: string;
  type: string;
  reminderEnabled?: boolean;
}

interface DbCalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  address: string | null;
  client: string | null;
  event_type: string | null;
  reminder_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export function useCalendarEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchEvents = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setEvents([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user.id)
        .order('event_date', { ascending: true });

      if (error) throw error;

      const mappedEvents: CalendarEvent[] = (data || []).map((event: DbCalendarEvent) => ({
        id: event.id,
        date: new Date(event.event_date),
        title: event.title,
        time: event.event_time ? formatTimeForDisplay(event.event_time) : undefined,
        description: event.description || undefined,
        address: event.address || undefined,
        client: event.client || undefined,
        type: event.event_type || 'custom',
        reminderEnabled: event.reminder_enabled,
      }));

      setEvents(mappedEvents);
    } catch (error: any) {
      console.error('Error fetching calendar events:', error);
      toast({
        title: "Error",
        description: "Failed to load calendar events.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const addEvent = async (event: Omit<CalendarEvent, 'id'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be signed in to add events.",
          variant: "destructive",
        });
        return false;
      }

      const newEvent = {
        user_id: user.id,
        title: event.title,
        description: event.description || null,
        event_date: event.date.toISOString().split('T')[0],
        event_time: event.time ? formatTimeForDb(event.time) : null,
        address: event.address || null,
        client: event.client || null,
        event_type: event.type,
        reminder_enabled: event.reminderEnabled || false,
      };

      const { data, error } = await supabase
        .from('calendar_events')
        .insert(newEvent)
        .select()
        .single();

      if (error) throw error;

      const mappedEvent: CalendarEvent = {
        id: data.id,
        date: new Date(data.event_date),
        title: data.title,
        time: data.event_time ? formatTimeForDisplay(data.event_time) : undefined,
        description: data.description || undefined,
        address: data.address || undefined,
        client: data.client || undefined,
        type: data.event_type || 'custom',
        reminderEnabled: data.reminder_enabled,
      };

      setEvents(prev => [...prev, mappedEvent]);

      toast({
        title: "Event added",
        description: `${event.title} has been added to your calendar`,
      });

      return true;
    } catch (error: any) {
      console.error('Error adding calendar event:', error);
      toast({
        title: "Error",
        description: "Failed to add event. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateEvent = async (eventId: string, updates: Partial<CalendarEvent>) => {
    try {
      const dbUpdates: Record<string, any> = {};
      
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.date !== undefined) dbUpdates.event_date = updates.date.toISOString().split('T')[0];
      if (updates.time !== undefined) dbUpdates.event_time = updates.time ? formatTimeForDb(updates.time) : null;
      if (updates.address !== undefined) dbUpdates.address = updates.address;
      if (updates.client !== undefined) dbUpdates.client = updates.client;
      if (updates.type !== undefined) dbUpdates.event_type = updates.type;
      if (updates.reminderEnabled !== undefined) dbUpdates.reminder_enabled = updates.reminderEnabled;

      const { error } = await supabase
        .from('calendar_events')
        .update(dbUpdates)
        .eq('id', eventId);

      if (error) throw error;

      setEvents(prev =>
        prev.map(event =>
          event.id === eventId ? { ...event, ...updates } : event
        )
      );

      toast({
        title: "Event updated",
        description: "Your event has been updated.",
      });

      return true;
    } catch (error: any) {
      console.error('Error updating calendar event:', error);
      toast({
        title: "Error",
        description: "Failed to update event. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      setEvents(prev => prev.filter(event => event.id !== eventId));

      toast({
        title: "Event deleted",
        description: "The event has been removed from your calendar.",
      });

      return true;
    } catch (error: any) {
      console.error('Error deleting calendar event:', error);
      toast({
        title: "Error",
        description: "Failed to delete event. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => 
      event.date.toDateString() === date.toDateString()
    );
  };

  const getTodayEvents = () => {
    const today = new Date();
    return events.filter(event => 
      event.date.toDateString() === today.toDateString()
    );
  };

  return {
    events,
    loading,
    addEvent,
    updateEvent,
    deleteEvent,
    getEventsForDate,
    getTodayEvents,
    refetch: fetchEvents,
  };
}

// Helper functions to format time
function formatTimeForDisplay(dbTime: string): string {
  // dbTime is in format "HH:MM:SS" or "HH:MM"
  const [hours, minutes] = dbTime.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

function formatTimeForDb(displayTime: string): string {
  // Handle "HH:MM" format from time input
  if (/^\d{2}:\d{2}$/.test(displayTime)) {
    return displayTime + ':00';
  }
  
  // Handle "H:MM AM/PM" format
  const match = displayTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const period = match[3].toUpperCase();
    
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    return `${hours.toString().padStart(2, '0')}:${minutes}:00`;
  }
  
  return displayTime;
}
