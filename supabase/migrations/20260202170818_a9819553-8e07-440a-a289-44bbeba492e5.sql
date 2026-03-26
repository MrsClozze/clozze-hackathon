-- Create junction table for task assignees (many-to-many)
CREATE TABLE public.task_assignees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  assigned_by UUID,
  UNIQUE(task_id, user_id)
);

-- Enable RLS
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_assignees
-- Users can view assignees for tasks they own or are in the same team
CREATE POLICY "Users can view task assignees for accessible tasks"
ON public.task_assignees
FOR SELECT
USING (
  task_id IN (
    SELECT id FROM public.tasks 
    WHERE user_id = auth.uid() OR shared_team(auth.uid(), user_id)
  )
);

-- Task owners can add assignees
CREATE POLICY "Task owners can add assignees"
ON public.task_assignees
FOR INSERT
WITH CHECK (
  task_id IN (
    SELECT id FROM public.tasks WHERE user_id = auth.uid()
  )
);

-- Task owners can remove assignees
CREATE POLICY "Task owners can remove assignees"
ON public.task_assignees
FOR DELETE
USING (
  task_id IN (
    SELECT id FROM public.tasks WHERE user_id = auth.uid()
  )
);

-- Create index for faster lookups
CREATE INDEX idx_task_assignees_task_id ON public.task_assignees(task_id);
CREATE INDEX idx_task_assignees_user_id ON public.task_assignees(user_id);

-- Migrate existing single assignees to the new table
INSERT INTO public.task_assignees (task_id, user_id, assigned_by)
SELECT id, assignee_user_id, user_id
FROM public.tasks
WHERE assignee_user_id IS NOT NULL;