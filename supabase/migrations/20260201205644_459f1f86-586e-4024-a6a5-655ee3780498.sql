
-- Allow team members to view basic profile info of their teammates
CREATE POLICY "Team members can view teammate profiles"
  ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = id 
    OR shared_team(auth.uid(), id)
  );

-- Drop the old restrictive policy and keep the new comprehensive one
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
