-- Add ai_requires_action column to track which emails need user attention
ALTER TABLE public.synced_emails 
ADD COLUMN IF NOT EXISTS ai_requires_action boolean DEFAULT false;

-- Add ai_ignored column to track emails user has dismissed
ALTER TABLE public.synced_emails 
ADD COLUMN IF NOT EXISTS ai_ignored boolean DEFAULT false;

-- Add index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_synced_emails_requires_action 
ON public.synced_emails(user_id, ai_requires_action, ai_ignored) 
WHERE ai_analyzed = true;