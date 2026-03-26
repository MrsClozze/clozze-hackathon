-- Add first_name and last_name columns to team_invitations table to store invitee info
ALTER TABLE public.team_invitations 
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text;