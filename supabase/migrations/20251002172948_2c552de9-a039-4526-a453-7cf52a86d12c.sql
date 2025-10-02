-- Helper functions to avoid RLS recursion when checking team membership
CREATE OR REPLACE FUNCTION public.shared_team(_u1 uuid, _u2 uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members tm1
    JOIN public.team_members tm2 ON tm1.team_id = tm2.team_id
    WHERE tm1.user_id = _u1
      AND tm2.user_id = _u2
      AND tm1.status = 'active'
      AND tm2.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.user_is_in_team(_user uuid, _team uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members t
    WHERE t.user_id = _user
      AND t.team_id = _team
      AND t.status = 'active'
  );
$$;

-- Ensure RLS is enabled (no-op if already enabled)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Replace policies to use helper function and avoid recursion
DROP POLICY IF EXISTS "Team members can view team tasks" ON public.tasks;
CREATE POLICY "Team members can view team tasks" ON public.tasks
FOR SELECT
USING (
  auth.uid() = user_id OR public.shared_team(auth.uid(), user_id)
);

DROP POLICY IF EXISTS "Team members can view team contacts" ON public.contacts;
CREATE POLICY "Team members can view team contacts" ON public.contacts
FOR SELECT
USING (
  auth.uid() = user_id OR public.shared_team(auth.uid(), user_id)
);

DROP POLICY IF EXISTS "Team members can view team buyers" ON public.buyers;
CREATE POLICY "Team members can view team buyers" ON public.buyers
FOR SELECT
USING (
  auth.uid() = user_id OR public.shared_team(auth.uid(), user_id)
);

DROP POLICY IF EXISTS "Team members can view team listings" ON public.listings;
CREATE POLICY "Team members can view team listings" ON public.listings
FOR SELECT
USING (
  auth.uid() = user_id OR public.shared_team(auth.uid(), user_id)
);

-- Optional: a safe, non-recursive SELECT policy for team_members itself (does not reference team_members policies)
DROP POLICY IF EXISTS "Members can view own or same-team memberships" ON public.team_members;
CREATE POLICY "Members can view own or same-team memberships" ON public.team_members
FOR SELECT
USING (
  user_id = auth.uid() OR public.user_is_in_team(auth.uid(), team_id)
);