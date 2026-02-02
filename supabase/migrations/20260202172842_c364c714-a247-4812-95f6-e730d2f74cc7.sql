-- Add show_on_calendar column to tasks table
ALTER TABLE public.tasks 
ADD COLUMN show_on_calendar boolean NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.tasks.show_on_calendar IS 'Whether the task should appear on the calendar view and sync to connected calendars';