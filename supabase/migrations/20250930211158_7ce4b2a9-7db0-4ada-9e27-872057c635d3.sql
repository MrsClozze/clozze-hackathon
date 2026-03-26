-- Create contacts table
CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  category TEXT NOT NULL,
  subcategory TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own contacts" 
ON public.contacts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own contacts" 
ON public.contacts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contacts" 
ON public.contacts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contacts" 
ON public.contacts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Team members can view team contacts
CREATE POLICY "Team members can view team contacts" 
ON public.contacts 
FOR SELECT 
USING (user_id IN (
  SELECT tm.user_id 
  FROM team_members tm 
  WHERE tm.team_id IN (
    SELECT team_id 
    FROM team_members 
    WHERE user_id = auth.uid() 
    AND status = 'active'
  ) 
  AND tm.status = 'active'
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_contacts_updated_at
BEFORE UPDATE ON public.contacts
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create contacts_documents table for document associations
CREATE TABLE public.contacts_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for contacts_documents
ALTER TABLE public.contacts_documents ENABLE ROW LEVEL SECURITY;

-- Policies for contacts_documents
CREATE POLICY "Users can view documents for their contacts" 
ON public.contacts_documents 
FOR SELECT 
USING (contact_id IN (
  SELECT id FROM public.contacts WHERE user_id = auth.uid()
));

CREATE POLICY "Users can upload documents for their contacts" 
ON public.contacts_documents 
FOR INSERT 
WITH CHECK (contact_id IN (
  SELECT id FROM public.contacts WHERE user_id = auth.uid()
));

CREATE POLICY "Users can delete documents for their contacts" 
ON public.contacts_documents 
FOR DELETE 
USING (contact_id IN (
  SELECT id FROM public.contacts WHERE user_id = auth.uid()
));