-- Create a function to store calendar tokens in vault (similar to store_integration_tokens)
CREATE OR REPLACE FUNCTION public.store_calendar_tokens(
  _user_id uuid,
  _provider text,
  _provider_email text,
  _provider_account_id text,
  _access_token text,
  _refresh_token text,
  _expires_at timestamp with time zone
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _vault_secret_id uuid;
  _connection_id uuid;
BEGIN
  -- Store tokens in vault
  INSERT INTO vault.secrets (secret, description)
  VALUES (
    jsonb_build_object(
      'access_token', _access_token,
      'refresh_token', _refresh_token
    ),
    'Calendar OAuth tokens for ' || _provider
  )
  RETURNING id INTO _vault_secret_id;

  -- Update or insert calendar connection record
  INSERT INTO public.calendar_connections (
    user_id,
    provider,
    provider_email,
    provider_account_id,
    vault_secret_id,
    token_expires_at,
    sync_enabled
  )
  VALUES (
    _user_id,
    _provider,
    _provider_email,
    _provider_account_id,
    _vault_secret_id,
    _expires_at,
    true
  )
  ON CONFLICT (user_id, provider)
  DO UPDATE SET
    provider_email = EXCLUDED.provider_email,
    provider_account_id = EXCLUDED.provider_account_id,
    vault_secret_id = _vault_secret_id,
    token_expires_at = EXCLUDED.token_expires_at,
    sync_enabled = true,
    updated_at = now()
  RETURNING id INTO _connection_id;

  RETURN _connection_id;
END;
$$;

-- Add vault_secret_id column to calendar_connections if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'calendar_connections' 
    AND column_name = 'vault_secret_id'
  ) THEN
    ALTER TABLE public.calendar_connections ADD COLUMN vault_secret_id uuid;
  END IF;
END $$;

-- Create admin role enum and user_roles table for admin authentication
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
  END IF;
END $$;

-- Create user_roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create security definer function to check admin role
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  )
$$;