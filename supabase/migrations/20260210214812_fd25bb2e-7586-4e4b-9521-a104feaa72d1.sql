
-- Phase 1: Allow assignees to update/delete tasks assigned to them
DROP POLICY IF EXISTS "Users can update their own tasks" ON public.tasks;

CREATE POLICY "Users can update owned or assigned tasks"
ON public.tasks
FOR UPDATE
USING (
  auth.uid() = user_id
  OR id IN (
    SELECT task_id FROM public.task_assignees
    WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete their own tasks" ON public.tasks;

CREATE POLICY "Users can delete owned or assigned tasks"
ON public.tasks
FOR DELETE
USING (
  auth.uid() = user_id
  OR id IN (
    SELECT task_id FROM public.task_assignees
    WHERE user_id = auth.uid()
  )
);

-- Phase 3a: Add calendar sync targets column
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS calendar_sync_targets jsonb DEFAULT NULL;

COMMENT ON COLUMN public.tasks.calendar_sync_targets IS 'Stores sync target preferences: { "mode": "all" | "selected", "userIds": ["uuid1", ...] }. Null = creator only.';
