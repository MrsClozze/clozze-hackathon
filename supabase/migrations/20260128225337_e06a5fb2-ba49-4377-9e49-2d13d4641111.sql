-- Add role and referral_source columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role text,
ADD COLUMN IF NOT EXISTS referral_source text;