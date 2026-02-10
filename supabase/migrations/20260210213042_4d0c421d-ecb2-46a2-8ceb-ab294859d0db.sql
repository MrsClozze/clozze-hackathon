-- Drop the duplicate/restrictive owner-only SELECT policies
DROP POLICY IF EXISTS "Owners can view their buyers" ON public.buyers;
DROP POLICY IF EXISTS "Users can view their own buyers" ON public.buyers;

-- Create a team-aware SELECT policy matching the listings pattern
CREATE POLICY "Team members can view team buyers"
ON public.buyers
FOR SELECT
USING (auth.uid() = user_id OR public.shared_team(auth.uid(), user_id));
