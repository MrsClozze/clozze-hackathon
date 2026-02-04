-- Add columns for storing Gmail OAuth tokens directly in service_integrations
-- (vault encryption not available in Cloud environment)
ALTER TABLE public.service_integrations 
ADD COLUMN IF NOT EXISTS access_token_encrypted TEXT,
ADD COLUMN IF NOT EXISTS refresh_token_encrypted TEXT;