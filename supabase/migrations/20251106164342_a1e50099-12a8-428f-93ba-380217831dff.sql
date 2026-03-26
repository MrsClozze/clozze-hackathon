-- Add 'enterprise' as a valid plan type
-- First, check if there's a constraint or enum for plan_type
-- If plan_type uses a check constraint, we'll update it
-- If it's an enum, we'll add the new value

-- Check if plan_type has a check constraint and update it if needed
-- Since we can't easily check, we'll add a constraint that allows enterprise
DO $$ 
BEGIN
  -- Drop existing check constraint if it exists
  ALTER TABLE public.subscriptions 
  DROP CONSTRAINT IF EXISTS subscriptions_plan_type_check;
  
  -- Add new check constraint that includes enterprise
  ALTER TABLE public.subscriptions 
  ADD CONSTRAINT subscriptions_plan_type_check 
  CHECK (plan_type IN ('free', 'pro', 'team', 'enterprise'));
EXCEPTION
  WHEN OTHERS THEN
    -- If constraint doesn't exist or can't be dropped, just add the new one
    ALTER TABLE public.subscriptions 
    ADD CONSTRAINT subscriptions_plan_type_check 
    CHECK (plan_type IN ('free', 'pro', 'team', 'enterprise'));
END $$;