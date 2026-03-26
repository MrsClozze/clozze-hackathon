
-- Allow team members to INSERT calendar events for admins who have calendar sharing enabled
CREATE POLICY "Team members can create events for sharing admins"
ON public.calendar_events
FOR INSERT
WITH CHECK (
  auth.uid() != user_id
  AND shared_team(auth.uid(), user_id)
  AND EXISTS (
    SELECT 1 FROM agent_communication_preferences acp
    WHERE acp.user_id = calendar_events.user_id
    AND acp.share_calendars_with_team = true
  )
);

-- Allow team members to update events they created for admins (using shared_team check)
CREATE POLICY "Team members can update shared calendar events"
ON public.calendar_events
FOR UPDATE
USING (
  shared_team(auth.uid(), user_id)
  AND EXISTS (
    SELECT 1 FROM agent_communication_preferences acp
    WHERE acp.user_id = calendar_events.user_id
    AND acp.share_calendars_with_team = true
  )
);

-- Allow team members to delete events on shared admin calendars
CREATE POLICY "Team members can delete shared calendar events"
ON public.calendar_events
FOR DELETE
USING (
  shared_team(auth.uid(), user_id)
  AND EXISTS (
    SELECT 1 FROM agent_communication_preferences acp
    WHERE acp.user_id = calendar_events.user_id
    AND acp.share_calendars_with_team = true
  )
);
