-- Fix: Team members should only see calendar events from users who have sharing enabled
-- Current policy is too broad: shared_team(auth.uid(), user_id) without checking share_calendars_with_team

DROP POLICY IF EXISTS "Team members can view team calendar events" ON public.calendar_events;

CREATE POLICY "Team members can view team calendar events"
ON public.calendar_events
FOR SELECT
USING (
  shared_team(auth.uid(), user_id)
  AND EXISTS (
    SELECT 1 FROM agent_communication_preferences acp
    WHERE acp.user_id = calendar_events.user_id
      AND acp.share_calendars_with_team = true
  )
);
