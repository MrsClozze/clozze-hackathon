-- Fix invitation SELECT/UPDATE policies to avoid referencing auth.users (permission denied)
-- Use auth.email() (available in Postgres) so invitees can see their own invite by email.

DROP POLICY IF EXISTS "Team members can view their team's invitations" ON public.team_invitations;
CREATE POLICY "Team members can view their team's invitations"
ON public.team_invitations
FOR SELECT
USING (
  team_id IN (
    SELECT tm.team_id
    FROM public.team_members tm
    WHERE tm.user_id = auth.uid()
      AND tm.status = 'active'
  )
  OR lower(email) = lower(auth.email())
);

DROP POLICY IF EXISTS "Team owners and admins can update invitations" ON public.team_invitations;
CREATE POLICY "Team owners and admins can update invitations"
ON public.team_invitations
FOR UPDATE
USING (
  team_id IN (
    SELECT tm.team_id
    FROM public.team_members tm
    WHERE tm.user_id = auth.uid()
      AND tm.role = ANY (ARRAY['owner'::public.team_member_role, 'admin'::public.team_member_role])
      AND tm.status = 'active'
  )
  OR lower(email) = lower(auth.email())
);
