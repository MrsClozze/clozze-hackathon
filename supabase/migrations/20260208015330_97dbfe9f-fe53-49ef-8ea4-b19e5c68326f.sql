-- Add start_date column for date range support on tasks
ALTER TABLE public.tasks ADD COLUMN start_date timestamp with time zone NULL;