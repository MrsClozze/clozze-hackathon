-- Fix infinite recursion in RLS policies by simplifying team member access checks

-- Drop existing problematic policies for tasks
DROP POLICY IF EXISTS "Team members can view team tasks" ON tasks;

-- Drop existing problematic policies for contacts  
DROP POLICY IF EXISTS "Team members can view team contacts" ON contacts;

-- Drop existing problematic policies for buyers
DROP POLICY IF EXISTS "Team members can view team buyers" ON buyers;

-- Drop existing problematic policies for listings
DROP POLICY IF EXISTS "Team members can view team listings" ON listings;

-- Recreate simplified policies that don't cause recursion
-- For tasks: Allow viewing own tasks OR tasks from team members
CREATE POLICY "Team members can view team tasks" ON tasks
FOR SELECT
USING (
  auth.uid() = user_id 
  OR 
  user_id IN (
    SELECT user_id 
    FROM team_members tm1
    WHERE tm1.team_id IN (
      SELECT team_id 
      FROM team_members tm2 
      WHERE tm2.user_id = auth.uid() 
      AND tm2.status = 'active'
    )
    AND tm1.status = 'active'
  )
);

-- For contacts: Allow viewing own contacts OR contacts from team members
CREATE POLICY "Team members can view team contacts" ON contacts
FOR SELECT
USING (
  auth.uid() = user_id 
  OR 
  user_id IN (
    SELECT user_id 
    FROM team_members tm1
    WHERE tm1.team_id IN (
      SELECT team_id 
      FROM team_members tm2 
      WHERE tm2.user_id = auth.uid() 
      AND tm2.status = 'active'
    )
    AND tm1.status = 'active'
  )
);

-- For buyers: Allow viewing own buyers OR buyers from team members
CREATE POLICY "Team members can view team buyers" ON buyers
FOR SELECT
USING (
  auth.uid() = user_id 
  OR 
  user_id IN (
    SELECT user_id 
    FROM team_members tm1
    WHERE tm1.team_id IN (
      SELECT team_id 
      FROM team_members tm2 
      WHERE tm2.user_id = auth.uid() 
      AND tm2.status = 'active'
    )
    AND tm1.status = 'active'
  )
);

-- For listings: Allow viewing own listings OR listings from team members
CREATE POLICY "Team members can view team listings" ON listings
FOR SELECT
USING (
  auth.uid() = user_id 
  OR 
  user_id IN (
    SELECT user_id 
    FROM team_members tm1
    WHERE tm1.team_id IN (
      SELECT team_id 
      FROM team_members tm2 
      WHERE tm2.user_id = auth.uid() 
      AND tm2.status = 'active'
    )
    AND tm1.status = 'active'
  )
);