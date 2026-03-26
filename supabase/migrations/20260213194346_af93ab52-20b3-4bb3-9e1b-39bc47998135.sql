
-- Change default for show_on_calendar to true
ALTER TABLE public.tasks ALTER COLUMN show_on_calendar SET DEFAULT true;

-- Update existing tasks to show on calendar
UPDATE public.tasks SET show_on_calendar = true WHERE show_on_calendar = false;
