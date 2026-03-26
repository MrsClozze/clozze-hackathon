-- Create enum for team member roles
CREATE TYPE public.team_member_role AS ENUM ('owner', 'admin', 'member');

-- Create enum for invitation status
CREATE TYPE public.invitation_status AS ENUM ('pending', 'accepted', 'declined', 'expired');

-- Create teams table
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create team_members table (connects agents to teams)
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.team_member_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  UNIQUE(team_id, user_id)
);

-- Create team_invitations table
CREATE TABLE public.team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.invitation_status NOT NULL DEFAULT 'pending',
  token UUID UNIQUE DEFAULT gen_random_uuid() NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for teams table
CREATE POLICY "Users can view teams they are members of"
  ON public.teams FOR SELECT
  USING (
    id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can create their own teams"
  ON public.teams FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Team owners can update their teams"
  ON public.teams FOR UPDATE
  USING (
    id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() AND role = 'owner' AND status = 'active'
    )
  );

CREATE POLICY "Team owners can delete their teams"
  ON public.teams FOR DELETE
  USING (
    id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() AND role = 'owner' AND status = 'active'
    )
  );

-- RLS Policies for team_members table
CREATE POLICY "Team members can view their team's members"
  ON public.team_members FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Team owners and admins can add members"
  ON public.team_members FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() 
        AND role IN ('owner', 'admin') 
        AND status = 'active'
    )
  );

CREATE POLICY "Team owners and admins can update members"
  ON public.team_members FOR UPDATE
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() 
        AND role IN ('owner', 'admin') 
        AND status = 'active'
    )
  );

CREATE POLICY "Team owners can remove members"
  ON public.team_members FOR DELETE
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() 
        AND role = 'owner' 
        AND status = 'active'
    )
  );

-- RLS Policies for team_invitations table
CREATE POLICY "Team members can view their team's invitations"
  ON public.team_invitations FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Team owners and admins can create invitations"
  ON public.team_invitations FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() 
        AND role IN ('owner', 'admin') 
        AND status = 'active'
    )
  );

CREATE POLICY "Team owners and admins can update invitations"
  ON public.team_invitations FOR UPDATE
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() 
        AND role IN ('owner', 'admin') 
        AND status = 'active'
    )
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for teams table
CREATE TRIGGER set_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create function to automatically add team creator as owner
CREATE OR REPLACE FUNCTION public.add_team_creator_as_owner()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to add team creator as owner
CREATE TRIGGER on_team_created
  AFTER INSERT ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.add_team_creator_as_owner();

-- Create indexes for better query performance
CREATE INDEX idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX idx_team_invitations_team_id ON public.team_invitations(team_id);
CREATE INDEX idx_team_invitations_email ON public.team_invitations(email);
CREATE INDEX idx_team_invitations_token ON public.team_invitations(token);