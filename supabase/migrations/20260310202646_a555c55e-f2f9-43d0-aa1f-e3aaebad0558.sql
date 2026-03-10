ALTER TABLE public.synced_emails
  ADD COLUMN buyer_id uuid REFERENCES public.buyers(id) ON DELETE SET NULL,
  ADD COLUMN listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL;