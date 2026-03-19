
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS highlights text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS internal_notes jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS marketing_copy jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.listings.description IS 'Primary MLS listing description. Clean overwrite by AI or user.';
COMMENT ON COLUMN public.listings.highlights IS 'Structured property highlights/features as array of strings.';
COMMENT ON COLUMN public.listings.internal_notes IS 'Append-only versioned notes. Array of {content, source, created_at} objects.';
COMMENT ON COLUMN public.listings.marketing_copy IS 'Keyed marketing copy variants. e.g. {"primary": "...", "social": "...", "email": "..."}';
