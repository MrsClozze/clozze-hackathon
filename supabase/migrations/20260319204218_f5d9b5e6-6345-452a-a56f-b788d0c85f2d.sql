
-- Task AI conversations table
CREATE TABLE public.task_ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Task AI actions log table
CREATE TABLE public.task_ai_actions_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  action_payload JSONB DEFAULT '{}'::jsonb,
  result JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_ai_actions_log ENABLE ROW LEVEL SECURITY;

-- RLS: users can only access their own conversations
CREATE POLICY "Users can view own task AI conversations"
  ON public.task_ai_conversations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own task AI conversations"
  ON public.task_ai_conversations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own task AI conversations"
  ON public.task_ai_conversations FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS: users can only access their own action logs
CREATE POLICY "Users can view own task AI action logs"
  ON public.task_ai_actions_log FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own task AI action logs"
  ON public.task_ai_actions_log FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX idx_task_ai_conversations_task_user ON public.task_ai_conversations(task_id, user_id);
CREATE INDEX idx_task_ai_conversations_created ON public.task_ai_conversations(created_at);
CREATE INDEX idx_task_ai_actions_log_task ON public.task_ai_actions_log(task_id);
