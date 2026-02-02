-- Add due_time column to tasks table for optional time scheduling
ALTER TABLE public.tasks 
ADD COLUMN due_time time without time zone DEFAULT NULL;

COMMENT ON COLUMN public.tasks.due_time IS 'Optional time for task scheduling (HH:MM format). NULL means all-day task.';