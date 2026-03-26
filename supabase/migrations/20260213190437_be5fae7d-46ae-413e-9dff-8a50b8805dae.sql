
-- Add sharing preference column
ALTER TABLE public.agent_communication_preferences
ADD COLUMN share_emails_with_team boolean NOT NULL DEFAULT false;

-- Allow team members to view synced_emails when the owner has sharing enabled
CREATE POLICY "Team members can view shared emails"
ON public.synced_emails
FOR SELECT
USING (
  shared_team(auth.uid(), user_id)
  AND EXISTS (
    SELECT 1 FROM public.agent_communication_preferences acp
    WHERE acp.user_id = synced_emails.user_id
      AND acp.share_emails_with_team = true
  )
);

-- Allow team members to update shared emails (e.g. mark as read, ignore)
CREATE POLICY "Team members can update shared emails"
ON public.synced_emails
FOR UPDATE
USING (
  shared_team(auth.uid(), user_id)
  AND EXISTS (
    SELECT 1 FROM public.agent_communication_preferences acp
    WHERE acp.user_id = synced_emails.user_id
      AND acp.share_emails_with_team = true
  )
);
