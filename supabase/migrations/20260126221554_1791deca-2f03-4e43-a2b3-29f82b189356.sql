-- Fix teams SELECT policy to allow creators to view their own teams
-- This is needed because:
-- 1. When a user creates a team, they need to see it immediately after INSERT
-- 2. The trigger adds them to team_members AFTER the INSERT completes
-- 3. But the .select().single() runs before the trigger's INSERT is visible

DROP POLICY IF EXISTS "Users can view teams they are members of" ON public.teams;

CREATE POLICY "Users can view teams they are members of"
ON public.teams
FOR SELECT
USING (
  -- Allow if user is the creator (for immediate visibility after creation)
  auth.uid() = created_by
  OR
  -- Allow if user is an active member of the team
  id IN (
    SELECT team_id FROM public.team_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);