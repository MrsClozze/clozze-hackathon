-- Fix infinite recursion in team_members RLS policies
-- Problem: Multiple policies query team_members directly, causing recursion

-- 1. Drop the problematic SELECT policy that still exists
DROP POLICY IF EXISTS "Team members can view their team's members" ON public.team_members;

-- 2. Create a SECURITY DEFINER helper function to check owner/admin role
-- This bypasses RLS and prevents recursion
CREATE OR REPLACE FUNCTION public.is_team_owner_or_admin(_user_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members t
    WHERE t.user_id = _user_id
      AND t.team_id = _team_id
      AND t.role IN ('owner', 'admin')
      AND t.status = 'active'
  );
$$;

-- 3. Create a SECURITY DEFINER helper function to check owner role only
CREATE OR REPLACE FUNCTION public.is_team_owner(_user_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members t
    WHERE t.user_id = _user_id
      AND t.team_id = _team_id
      AND t.role = 'owner'
      AND t.status = 'active'
  );
$$;

-- 4. Drop and recreate INSERT policy using the helper function
DROP POLICY IF EXISTS "Team owners and admins can add members" ON public.team_members;
CREATE POLICY "Team owners and admins can add members"
ON public.team_members
FOR INSERT
WITH CHECK (public.is_team_owner_or_admin(auth.uid(), team_id));

-- 5. Drop and recreate UPDATE policy using the helper function
DROP POLICY IF EXISTS "Team owners and admins can update members" ON public.team_members;
CREATE POLICY "Team owners and admins can update members"
ON public.team_members
FOR UPDATE
USING (public.is_team_owner_or_admin(auth.uid(), team_id));

-- 6. Drop and recreate DELETE policy using the helper function
DROP POLICY IF EXISTS "Team owners can remove members" ON public.team_members;
CREATE POLICY "Team owners can remove members"
ON public.team_members
FOR DELETE
USING (public.is_team_owner(_user_id := auth.uid(), _team_id := team_id));