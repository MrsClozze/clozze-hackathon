-- Add website_url column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN website_url text;