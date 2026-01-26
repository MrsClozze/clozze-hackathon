-- Fix team_members INSERT policy to allow the trigger to add the team creator
-- Problem: When a team is created, the add_team_creator_as_owner trigger tries to insert
-- the creator as owner, but the INSERT policy fails because they're not yet in the team.

-- Drop and recreate INSERT policy to also allow self-insertion as owner during team creation
DROP POLICY IF EXISTS "Team owners and admins can add members" ON public.team_members;

CREATE POLICY "Team owners and admins can add members"
ON public.team_members
FOR INSERT
WITH CHECK (
  -- Allow if user is already owner/admin of this team
  public.is_team_owner_or_admin(auth.uid(), team_id)
  OR
  -- Allow self-insertion as owner (for initial team creation trigger)
  (user_id = auth.uid() AND role = 'owner')
);