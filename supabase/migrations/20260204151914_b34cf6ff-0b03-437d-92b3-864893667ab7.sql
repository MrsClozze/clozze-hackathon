-- Add column to store external calendar event ID for synced tasks
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS external_calendar_event_id TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.tasks.external_calendar_event_id IS 'Google Calendar event ID for synced tasks';