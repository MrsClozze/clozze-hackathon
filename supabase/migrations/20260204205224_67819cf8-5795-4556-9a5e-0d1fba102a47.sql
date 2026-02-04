-- Add 'gmail' to the allowed service names in service_integrations
ALTER TABLE public.service_integrations 
DROP CONSTRAINT service_integrations_service_name_check;

ALTER TABLE public.service_integrations 
ADD CONSTRAINT service_integrations_service_name_check 
CHECK (service_name = ANY (ARRAY['google_calendar'::text, 'outlook_calendar'::text, 'apple_calendar'::text, 'docusign'::text, 'slack'::text, 'gmail'::text]));