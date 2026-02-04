-- Create table for storing synced emails from Gmail
CREATE TABLE public.synced_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  external_email_id TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  sender_name TEXT,
  subject TEXT,
  snippet TEXT,
  body_preview TEXT,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_read BOOLEAN DEFAULT false,
  labels TEXT[],
  thread_id TEXT,
  ai_analyzed BOOLEAN DEFAULT false,
  ai_action_item TEXT,
  ai_priority TEXT CHECK (ai_priority IN ('low', 'medium', 'high', 'urgent')),
  ai_category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, external_email_id)
);

-- Enable Row Level Security
ALTER TABLE public.synced_emails ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own synced emails" 
ON public.synced_emails 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own synced emails" 
ON public.synced_emails 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own synced emails" 
ON public.synced_emails 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own synced emails" 
ON public.synced_emails 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_synced_emails_user_received ON public.synced_emails(user_id, received_at DESC);
CREATE INDEX idx_synced_emails_analyzed ON public.synced_emails(user_id, ai_analyzed);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_synced_emails_updated_at
BEFORE UPDATE ON public.synced_emails
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();