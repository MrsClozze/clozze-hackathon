-- Allow team members to view calendar connections from teammates
DROP POLICY IF EXISTS "Users can view their own calendar connections" ON public.calendar_connections;

CREATE POLICY "Team members can view team calendar connections"
ON public.calendar_connections
FOR SELECT
USING (auth.uid() = user_id OR public.shared_team(auth.uid(), user_id));
