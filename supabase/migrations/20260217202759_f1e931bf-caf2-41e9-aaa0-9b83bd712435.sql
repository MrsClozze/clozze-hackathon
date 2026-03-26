
-- Add access level column for calendar sharing (view vs edit)
ALTER TABLE public.agent_communication_preferences
ADD COLUMN share_calendars_access_level text NOT NULL DEFAULT 'view';

-- Allow teammates to read sharing preferences (needed to determine if admin calendar tab should show)
CREATE POLICY "Team members can view teammate sharing preferences"
ON public.agent_communication_preferences
FOR SELECT
USING (shared_team(auth.uid(), user_id));
