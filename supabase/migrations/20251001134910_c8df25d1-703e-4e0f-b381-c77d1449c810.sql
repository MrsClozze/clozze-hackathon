-- Create tasks table
CREATE TABLE public.tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  date text,
  due_date timestamp with time zone,
  address text,
  assignee text,
  has_ai_assist boolean NOT NULL DEFAULT false,
  priority text NOT NULL DEFAULT 'medium',
  notes text,
  status text NOT NULL DEFAULT 'pending',
  buyer_id uuid,
  listing_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT fk_buyer FOREIGN KEY (buyer_id) REFERENCES public.buyers(id) ON DELETE SET NULL,
  CONSTRAINT fk_listing FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE SET NULL
);

-- Enable Row Level Security
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own tasks" 
ON public.tasks 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tasks" 
ON public.tasks 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks" 
ON public.tasks 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks" 
ON public.tasks 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create policy for team members to view team tasks
CREATE POLICY "Team members can view team tasks" 
ON public.tasks 
FOR SELECT 
USING (user_id IN (
  SELECT tm.user_id
  FROM team_members tm
  WHERE tm.team_id IN (
    SELECT team_id
    FROM team_members
    WHERE user_id = auth.uid() AND status = 'active'
  ) AND tm.status = 'active'
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();