-- Drop the overly permissive team member policy first
DROP POLICY IF EXISTS "Team members can view team buyers" ON public.buyers;

-- Restrict direct table access to owners only
CREATE POLICY "Owners can view their buyers"
ON public.buyers
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create a security definer function that returns buyers with conditional financial data
CREATE OR REPLACE FUNCTION public.get_team_buyers()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  first_name text,
  last_name text,
  email text,
  phone text,
  status text,
  wants_needs text,
  created_at timestamptz,
  updated_at timestamptz,
  pre_approved_amount numeric,
  commission_percentage numeric,
  agent_commission numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.user_id,
    b.first_name,
    b.last_name,
    b.email,
    b.phone,
    b.status,
    b.wants_needs,
    b.created_at,
    b.updated_at,
    -- Financial data is only returned if the user is the owner
    CASE WHEN b.user_id = auth.uid() THEN b.pre_approved_amount ELSE NULL END,
    CASE WHEN b.user_id = auth.uid() THEN b.commission_percentage ELSE NULL END,
    CASE WHEN b.user_id = auth.uid() THEN b.agent_commission ELSE NULL END
  FROM public.buyers b
  WHERE b.user_id = auth.uid() 
     OR shared_team(auth.uid(), b.user_id);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_team_buyers() TO authenticated;

-- Add audit logging table for sensitive financial data access
CREATE TABLE IF NOT EXISTS public.buyer_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES public.buyers(id) ON DELETE CASCADE,
  accessed_by uuid NOT NULL,
  accessed_at timestamptz NOT NULL DEFAULT now(),
  access_type text NOT NULL,
  ip_address text
);

-- Enable RLS on audit logs
ALTER TABLE public.buyer_access_logs ENABLE ROW LEVEL SECURITY;

-- Users can only view their own access logs or logs for their buyers
CREATE POLICY "Users can view relevant access logs"
ON public.buyer_access_logs
FOR SELECT
TO authenticated
USING (
  accessed_by = auth.uid() OR 
  buyer_id IN (SELECT id FROM public.buyers WHERE user_id = auth.uid())
);

-- Only authenticated users can insert audit logs
CREATE POLICY "System can insert audit logs"
ON public.buyer_access_logs
FOR INSERT
TO authenticated
WITH CHECK (accessed_by = auth.uid());

COMMENT ON FUNCTION public.get_team_buyers IS 'Returns buyers for the current user and their team members. Financial data (pre_approved_amount, commission_percentage, agent_commission) is only visible to the buyer owner for security.';
COMMENT ON TABLE public.buyer_access_logs IS 'Audit log for tracking access to sensitive buyer financial data.';