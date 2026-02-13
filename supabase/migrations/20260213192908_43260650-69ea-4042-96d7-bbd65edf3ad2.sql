
-- Add share_calendars_with_team column to agent_communication_preferences
ALTER TABLE public.agent_communication_preferences
ADD COLUMN IF NOT EXISTS share_calendars_with_team boolean NOT NULL DEFAULT false;

-- Drop the existing team viewing policy on calendar_connections
DROP POLICY IF EXISTS "Team members can view team calendar connections" ON public.calendar_connections;

-- Re-create it gated on the owner's share_calendars_with_team preference
CREATE POLICY "Team members can view team calendar connections"
ON public.calendar_connections
FOR SELECT
USING (
  (auth.uid() = user_id)
  OR (
    shared_team(auth.uid(), user_id)
    AND EXISTS (
      SELECT 1 FROM agent_communication_preferences acp
      WHERE acp.user_id = calendar_connections.user_id
        AND acp.share_calendars_with_team = true
    )
  )
);
