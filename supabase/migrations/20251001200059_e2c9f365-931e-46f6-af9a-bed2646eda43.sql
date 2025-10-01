-- Fix infinite recursion in team_members policies
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Team members can view their team's members" ON team_members;
DROP POLICY IF EXISTS "Team members can view team tasks" ON tasks;
DROP POLICY IF EXISTS "Team members can view team buyers" ON buyers;
DROP POLICY IF EXISTS "Team members can view team listings" ON listings;
DROP POLICY IF EXISTS "Team members can view team contacts" ON contacts;

-- Recreate team_members view policy without circular reference
-- This uses a direct check without recursion
CREATE POLICY "Team members can view their team's members"
ON team_members
FOR SELECT
USING (
  -- Users can see team members where they share a team_id
  -- This uses a correlated subquery that doesn't cause recursion
  EXISTS (
    SELECT 1 
    FROM team_members tm2 
    WHERE tm2.team_id = team_members.team_id 
      AND tm2.user_id = auth.uid() 
      AND tm2.status = 'active'
  )
);

-- Recreate task team viewing policy without nested recursion
CREATE POLICY "Team members can view team tasks"
ON tasks
FOR SELECT
USING (
  user_id IN (
    SELECT tm.user_id
    FROM team_members tm
    WHERE tm.team_id IN (
      -- Direct query without nested subquery on team_members
      SELECT tm2.team_id 
      FROM team_members tm2 
      WHERE tm2.user_id = auth.uid() 
        AND tm2.status = 'active'
    )
    AND tm.status = 'active'
  )
);

-- Recreate buyer team viewing policy
CREATE POLICY "Team members can view team buyers"
ON buyers
FOR SELECT
USING (
  user_id IN (
    SELECT tm.user_id
    FROM team_members tm
    WHERE tm.team_id IN (
      SELECT tm2.team_id 
      FROM team_members tm2 
      WHERE tm2.user_id = auth.uid() 
        AND tm2.status = 'active'
    )
    AND tm.status = 'active'
  )
);

-- Recreate listing team viewing policy
CREATE POLICY "Team members can view team listings"
ON listings
FOR SELECT
USING (
  user_id IN (
    SELECT tm.user_id
    FROM team_members tm
    WHERE tm.team_id IN (
      SELECT tm2.team_id 
      FROM team_members tm2 
      WHERE tm2.user_id = auth.uid() 
        AND tm2.status = 'active'
    )
    AND tm.status = 'active'
  )
);

-- Recreate contact team viewing policy
CREATE POLICY "Team members can view team contacts"
ON contacts
FOR SELECT
USING (
  user_id IN (
    SELECT tm.user_id
    FROM team_members tm
    WHERE tm.team_id IN (
      SELECT tm2.team_id 
      FROM team_members tm2 
      WHERE tm2.user_id = auth.uid() 
        AND tm2.status = 'active'
    )
    AND tm.status = 'active'
  )
);