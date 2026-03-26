-- Drop the overly permissive team member policy
DROP POLICY IF EXISTS "Team members can view team buyers" ON public.buyers;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.get_team_buyers();

-- Create a secure function that returns buyers with conditional financial data visibility
CREATE FUNCTION public.get_team_buyers()
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
  agent_commission numeric,
  is_owner boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
    -- Financial data is only returned for owners
    CASE WHEN b.user_id = auth.uid() THEN b.pre_approved_amount ELSE NULL END as pre_approved_amount,
    CASE WHEN b.user_id = auth.uid() THEN b.commission_percentage ELSE NULL END as commission_percentage,
    CASE WHEN b.user_id = auth.uid() THEN b.agent_commission ELSE NULL END as agent_commission,
    (b.user_id = auth.uid()) as is_owner
  FROM public.buyers b
  WHERE 
    b.user_id = auth.uid() 
    OR shared_team(auth.uid(), b.user_id);
$$;

-- Create audit logging table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.buyer_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES public.buyers(id) ON DELETE CASCADE,
  accessed_by uuid NOT NULL,
  accessed_at timestamptz NOT NULL DEFAULT now(),
  access_type text NOT NULL CHECK (access_type IN ('view_financial', 'view_basic', 'update', 'delete')),
  ip_address text
);

-- Enable RLS on audit logs
ALTER TABLE public.buyer_access_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view relevant access logs" ON public.buyer_access_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.buyer_access_logs;

-- Create policies for audit logs
CREATE POLICY "Users can view relevant access logs"
ON public.buyer_access_logs
FOR SELECT
TO authenticated
USING (
  accessed_by = auth.uid() OR 
  buyer_id IN (SELECT id FROM public.buyers WHERE user_id = auth.uid())
);

CREATE POLICY "System can insert audit logs"
ON public.buyer_access_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add helpful comments
COMMENT ON FUNCTION public.get_team_buyers() IS 'Returns buyers for the current user and their team members. Financial data (pre_approved_amount, commission_percentage, agent_commission) is only visible to the buyer owner. Use this function for team views to protect sensitive financial information.';
COMMENT ON TABLE public.buyer_access_logs IS 'Audit log for tracking access to buyer data, especially sensitive financial information.';