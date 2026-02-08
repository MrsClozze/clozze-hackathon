
-- Add recurrence columns to tasks table
ALTER TABLE public.tasks 
  ADD COLUMN recurrence_pattern text NULL,
  ADD COLUMN recurrence_end_date date NULL,
  ADD COLUMN parent_task_id uuid NULL REFERENCES public.tasks(id) ON DELETE SET NULL,
  ADD COLUMN recurrence_index integer NULL DEFAULT NULL;

-- Index for efficient lookups of child instances by parent
CREATE INDEX idx_tasks_parent_task_id ON public.tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;

-- Index for finding recurring parents that need instance generation
CREATE INDEX idx_tasks_recurrence_pattern ON public.tasks(recurrence_pattern) WHERE recurrence_pattern IS NOT NULL AND parent_task_id IS NULL;

-- Comment for clarity
COMMENT ON COLUMN public.tasks.recurrence_pattern IS 'Recurrence preset: daily, weekly, biweekly, monthly. NULL means non-recurring.';
COMMENT ON COLUMN public.tasks.recurrence_end_date IS 'Optional end date after which no more instances are generated.';
COMMENT ON COLUMN public.tasks.parent_task_id IS 'References the original recurring task template. NULL for standalone/parent tasks.';
COMMENT ON COLUMN public.tasks.recurrence_index IS 'Sequential index of this instance within the recurrence series.';
