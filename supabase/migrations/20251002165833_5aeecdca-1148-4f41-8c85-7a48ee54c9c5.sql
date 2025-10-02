-- Create table for agent communication preferences and onboarding data
CREATE TABLE IF NOT EXISTS public.agent_communication_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  general_clients_style TEXT,
  listing_clients_style TEXT,
  buyer_clients_style TEXT,
  lenders_style TEXT,
  title_companies_style TEXT,
  insurance_agents_style TEXT,
  coworkers_style TEXT,
  general_tone_frequency TEXT,
  has_booking_link BOOLEAN DEFAULT FALSE,
  booking_link_url TEXT,
  has_preferred_email BOOLEAN DEFAULT FALSE,
  preferred_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.agent_communication_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own preferences"
  ON public.agent_communication_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON public.agent_communication_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON public.agent_communication_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_agent_communication_preferences_updated_at
  BEFORE UPDATE ON public.agent_communication_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();