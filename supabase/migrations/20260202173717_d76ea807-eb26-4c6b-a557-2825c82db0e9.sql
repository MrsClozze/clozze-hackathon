-- Add column for syncing to external calendar (Google/Apple)
ALTER TABLE public.tasks 
ADD COLUMN sync_to_external_calendar boolean NOT NULL DEFAULT false;