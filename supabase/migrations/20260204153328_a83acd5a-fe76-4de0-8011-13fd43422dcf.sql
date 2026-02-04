-- Add end_time column to tasks table for event duration
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS end_time TEXT;

COMMENT ON COLUMN public.tasks.end_time IS 'End time for task events in HH:MM format';

-- Add timezone column to profiles table for user timezone preference
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Los_Angeles';

COMMENT ON COLUMN public.profiles.timezone IS 'User timezone for calendar event scheduling (IANA timezone name)';