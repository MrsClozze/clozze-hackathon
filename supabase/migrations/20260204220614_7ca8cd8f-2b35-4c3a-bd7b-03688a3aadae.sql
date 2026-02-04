-- Create table for WhatsApp Business API credentials (BYOK model)
CREATE TABLE public.whatsapp_business_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  phone_number_id TEXT NOT NULL,
  business_phone_number TEXT,
  access_token_encrypted TEXT NOT NULL,
  webhook_verify_token TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  is_connected BOOLEAN NOT NULL DEFAULT true,
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_business_connections_user_id_key UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.whatsapp_business_connections ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own WhatsApp connection"
  ON public.whatsapp_business_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own WhatsApp connection"
  ON public.whatsapp_business_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own WhatsApp connection"
  ON public.whatsapp_business_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own WhatsApp connection"
  ON public.whatsapp_business_connections FOR DELETE
  USING (auth.uid() = user_id);

-- Create synced_messages table for WhatsApp/SMS messages
CREATE TABLE public.synced_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  external_message_id TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'whatsapp',
  direction TEXT NOT NULL DEFAULT 'inbound',
  sender_phone TEXT,
  sender_name TEXT,
  recipient_phone TEXT,
  message_body TEXT,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_read BOOLEAN DEFAULT false,
  ai_analyzed BOOLEAN DEFAULT false,
  ai_requires_action BOOLEAN DEFAULT false,
  ai_priority TEXT,
  ai_action_item TEXT,
  ai_category TEXT,
  ai_ignored BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT synced_messages_external_id_user_key UNIQUE (external_message_id, user_id)
);

-- Enable RLS
ALTER TABLE public.synced_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own messages"
  ON public.synced_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own messages"
  ON public.synced_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own messages"
  ON public.synced_messages FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own messages"
  ON public.synced_messages FOR DELETE
  USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX idx_synced_messages_user_id ON public.synced_messages(user_id);
CREATE INDEX idx_synced_messages_received_at ON public.synced_messages(received_at DESC);
CREATE INDEX idx_synced_messages_source ON public.synced_messages(source);
CREATE INDEX idx_synced_messages_needs_attention ON public.synced_messages(user_id, ai_analyzed, ai_ignored) 
  WHERE ai_analyzed = true AND ai_ignored = false;

-- Add updated_at triggers
CREATE TRIGGER update_whatsapp_business_connections_updated_at
  BEFORE UPDATE ON public.whatsapp_business_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_synced_messages_updated_at
  BEFORE UPDATE ON public.synced_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();