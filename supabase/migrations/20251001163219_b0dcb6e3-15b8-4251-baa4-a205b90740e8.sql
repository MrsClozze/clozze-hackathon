-- Add onboarding tracking to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

-- Add avatar_url for future use
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_url text;