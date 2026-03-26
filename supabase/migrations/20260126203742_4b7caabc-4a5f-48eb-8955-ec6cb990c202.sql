-- Create table to track paid team member slots for users
CREATE TABLE public.team_member_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_slots INTEGER NOT NULL DEFAULT 0,
  stripe_subscription_id TEXT,
  stripe_subscription_item_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.team_member_slots ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own team member slots"
  ON public.team_member_slots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own team member slots"
  ON public.team_member_slots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own team member slots"
  ON public.team_member_slots FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_team_member_slots_updated_at
  BEFORE UPDATE ON public.team_member_slots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();