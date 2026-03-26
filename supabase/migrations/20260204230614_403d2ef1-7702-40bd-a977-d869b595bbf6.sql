-- Drop the existing check constraint
ALTER TABLE public.service_integrations DROP CONSTRAINT IF EXISTS service_integrations_service_name_check;

-- Add the updated check constraint that includes 'dotloop'
ALTER TABLE public.service_integrations 
ADD CONSTRAINT service_integrations_service_name_check 
CHECK (service_name IN ('gmail', 'outlook', 'docusign', 'dotloop', 'follow_up_boss'));