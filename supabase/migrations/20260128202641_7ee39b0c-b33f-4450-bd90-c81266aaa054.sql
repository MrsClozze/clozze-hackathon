-- Add contact_id column to tasks table for linking tasks to contacts
ALTER TABLE public.tasks 
ADD COLUMN contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL;

-- Add an index for better query performance
CREATE INDEX idx_tasks_contact_id ON public.tasks(contact_id);

-- Add assignee_user_id column for linking tasks to team members (user_id from profiles)
ALTER TABLE public.tasks 
ADD COLUMN assignee_user_id uuid;

-- Add an index for assignee_user_id
CREATE INDEX idx_tasks_assignee_user_id ON public.tasks(assignee_user_id);