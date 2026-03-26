-- Step 1: Remove plaintext token columns and add vault reference
ALTER TABLE public.service_integrations 
DROP COLUMN IF EXISTS access_token,
DROP COLUMN IF EXISTS refresh_token,
ADD COLUMN IF NOT EXISTS vault_secret_id uuid;

-- Step 2: Create a secure function to store tokens in vault
CREATE OR REPLACE FUNCTION public.store_integration_tokens(
  _user_id uuid,
  _service_name text,
  _access_token text,
  _refresh_token text,
  _expires_at timestamptz
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _vault_secret_id uuid;
  _integration_id uuid;
BEGIN
  -- Store tokens in vault
  INSERT INTO vault.secrets (secret, description)
  VALUES (
    jsonb_build_object(
      'access_token', _access_token,
      'refresh_token', _refresh_token
    ),
    'OAuth tokens for ' || _service_name
  )
  RETURNING id INTO _vault_secret_id;

  -- Update or insert integration record
  INSERT INTO public.service_integrations (
    user_id,
    service_name,
    vault_secret_id,
    is_connected,
    connected_at,
    token_expires_at
  )
  VALUES (
    _user_id,
    _service_name,
    _vault_secret_id,
    true,
    now(),
    _expires_at
  )
  ON CONFLICT (user_id, service_name)
  DO UPDATE SET
    vault_secret_id = _vault_secret_id,
    is_connected = true,
    connected_at = now(),
    token_expires_at = _expires_at,
    updated_at = now()
  RETURNING id INTO _integration_id;

  RETURN _integration_id;
END;
$$;

-- Step 3: Add unique constraint (check if exists first)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_user_service' 
    AND conrelid = 'public.service_integrations'::regclass
  ) THEN
    ALTER TABLE public.service_integrations
    ADD CONSTRAINT unique_user_service UNIQUE (user_id, service_name);
  END IF;
END$$;

-- Step 4: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_service_integrations_user_service 
ON public.service_integrations(user_id, service_name);

-- Step 5: Update comments for clarity
COMMENT ON TABLE public.service_integrations IS 'Stores OAuth integration metadata. Actual tokens are encrypted in vault.secrets table.';
COMMENT ON COLUMN public.service_integrations.vault_secret_id IS 'Reference to encrypted tokens in vault.secrets';
