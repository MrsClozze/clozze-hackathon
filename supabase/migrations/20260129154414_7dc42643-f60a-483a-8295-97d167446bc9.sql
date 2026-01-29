-- Fix audit logs policy to prevent log poisoning
-- Drop the permissive policy and replace with a restrictive one
DROP POLICY IF EXISTS "System can insert audit logs" ON public.buyer_access_logs;

CREATE POLICY "Users can insert their own audit logs" 
ON public.buyer_access_logs 
FOR INSERT 
WITH CHECK (accessed_by = auth.uid());