-- Create function to update timestamps (if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create table for WhatsApp integrations
CREATE TABLE IF NOT EXISTS public.whatsapp_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  verification_code TEXT,
  verification_code_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.whatsapp_integrations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own WhatsApp integration"
  ON public.whatsapp_integrations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own WhatsApp integration"
  ON public.whatsapp_integrations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own WhatsApp integration"
  ON public.whatsapp_integrations
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own WhatsApp integration"
  ON public.whatsapp_integrations
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER update_whatsapp_integrations_updated_at
  BEFORE UPDATE ON public.whatsapp_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();