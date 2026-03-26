-- Create calendar_events table
CREATE TABLE public.calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME,
  address TEXT,
  client TEXT,
  event_type TEXT DEFAULT 'custom',
  reminder_enabled BOOLEAN DEFAULT false,
  reminder_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own calendar events" 
ON public.calendar_events FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own calendar events" 
ON public.calendar_events FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calendar events" 
ON public.calendar_events FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calendar events" 
ON public.calendar_events FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_calendar_events_updated_at
BEFORE UPDATE ON public.calendar_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Team members can view team calendar events
CREATE POLICY "Team members can view team calendar events" 
ON public.calendar_events FOR SELECT 
USING (shared_team(auth.uid(), user_id));