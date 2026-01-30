-- Add account_state column to profiles table
-- 'demo' = new users see curated sample data
-- 'live' = user has created real data, only show their actual records
ALTER TABLE public.profiles 
ADD COLUMN account_state text NOT NULL DEFAULT 'demo' 
CHECK (account_state IN ('demo', 'live'));

-- Add index for efficient filtering
CREATE INDEX idx_profiles_account_state ON public.profiles(account_state);

-- Comment for documentation
COMMENT ON COLUMN public.profiles.account_state IS 'Controls whether user sees demo sample data (demo) or only their real data (live). Flips to live on first listing/buyer creation.';