
-- Table to track DocuSign envelopes sent from Clozze
CREATE TABLE public.docusign_envelopes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  envelope_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'created',
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  buyer_id UUID REFERENCES public.buyers(id) ON DELETE SET NULL,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
  document_name TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  voided_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, envelope_id)
);

-- RLS
ALTER TABLE public.docusign_envelopes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own envelopes"
  ON public.docusign_envelopes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own envelopes"
  ON public.docusign_envelopes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own envelopes"
  ON public.docusign_envelopes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own envelopes"
  ON public.docusign_envelopes FOR DELETE
  USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER update_docusign_envelopes_updated_at
  BEFORE UPDATE ON public.docusign_envelopes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.docusign_envelopes;
