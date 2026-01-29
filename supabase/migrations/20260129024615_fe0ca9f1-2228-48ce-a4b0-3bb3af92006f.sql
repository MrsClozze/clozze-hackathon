-- Create calendar_connections table to track OAuth-connected calendars
CREATE TABLE public.calendar_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'outlook', 'apple')),
  provider_account_id TEXT,
  provider_email TEXT,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  sync_enabled BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- Enable RLS
ALTER TABLE public.calendar_connections ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own calendar connections" 
ON public.calendar_connections FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own calendar connections" 
ON public.calendar_connections FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calendar connections" 
ON public.calendar_connections FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calendar connections" 
ON public.calendar_connections FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_calendar_connections_updated_at
BEFORE UPDATE ON public.calendar_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add source field to calendar_events to track which provider the event came from
ALTER TABLE public.calendar_events 
ADD COLUMN source TEXT DEFAULT 'manual',
ADD COLUMN external_event_id TEXT,
ADD COLUMN calendar_connection_id UUID REFERENCES public.calendar_connections(id) ON DELETE SET NULL;