-- Add team onboarding tracking to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS team_onboarding_completed BOOLEAN DEFAULT false;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_team_onboarding 
ON public.profiles(team_onboarding_completed);