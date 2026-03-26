-- First, drop the existing check constraint on plan_type
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_type_check;

-- Add new check constraint that includes 'team_member' as a valid plan type
ALTER TABLE public.subscriptions 
ADD CONSTRAINT subscriptions_plan_type_check 
CHECK (plan_type = ANY (ARRAY['free'::text, 'pro'::text, 'team'::text, 'enterprise'::text, 'team_member'::text]));

-- Create function to handle team invitation acceptance on profile creation
CREATE OR REPLACE FUNCTION public.on_profile_created_accept_invitations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invitation RECORD;
BEGIN
  -- Find pending invitation for this email
  SELECT ti.*, t.created_by INTO _invitation
  FROM public.team_invitations ti
  JOIN public.teams t ON t.id = ti.team_id
  WHERE LOWER(ti.email) = LOWER(NEW.email)
    AND ti.status = 'pending'
    AND ti.expires_at > NOW()
  ORDER BY ti.created_at DESC
  LIMIT 1;

  -- If invitation found, accept it
  IF _invitation.id IS NOT NULL THEN
    -- Update invitation status to accepted
    UPDATE public.team_invitations
    SET status = 'accepted'
    WHERE id = _invitation.id;

    -- Add user as team member
    INSERT INTO public.team_members (team_id, user_id, role, status)
    VALUES (_invitation.team_id, NEW.id, 'member', 'active')
    ON CONFLICT (team_id, user_id) DO NOTHING;

    -- Update subscription to 'team_member' status instead of 'trial'
    -- This marks them as part of a team, not a free trial user
    UPDATE public.subscriptions
    SET plan_type = 'team_member',
        status = 'active',
        trial_end = NULL
    WHERE user_id = NEW.id;

    RAISE LOG '[on_profile_created_accept_invitations] User % accepted invitation to team %', NEW.id, _invitation.team_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on profiles table (fires after handle_new_user creates the profile)
DROP TRIGGER IF EXISTS on_profile_created_accept_invitations ON public.profiles;
CREATE TRIGGER on_profile_created_accept_invitations
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.on_profile_created_accept_invitations();