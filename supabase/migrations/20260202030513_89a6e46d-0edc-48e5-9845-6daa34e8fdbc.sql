-- Create RPC function to accept team invitation for existing users
-- This handles the case where an existing user (already has profile) is invited to a team

CREATE OR REPLACE FUNCTION public.accept_team_invitation(_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _invitation RECORD;
  _user_id uuid;
  _replaced_user_id uuid;
  _account_age_days integer;
  _original_trial_end timestamp with time zone;
  _result jsonb;
BEGIN
  -- Get the current user
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not authenticated');
  END IF;

  -- Find the invitation by token
  SELECT ti.*, t.created_by INTO _invitation
  FROM public.team_invitations ti
  JOIN public.teams t ON t.id = ti.team_id
  WHERE ti.token = _token
    AND ti.status = 'pending'
    AND ti.expires_at > NOW()
  LIMIT 1;

  IF _invitation.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;

  -- Verify the invitation email matches the current user's email
  IF LOWER(_invitation.email) != LOWER((SELECT email FROM profiles WHERE id = _user_id)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation email does not match your account');
  END IF;

  -- Check if user is already a member of this team
  IF EXISTS (SELECT 1 FROM team_members WHERE team_id = _invitation.team_id AND user_id = _user_id AND status = 'active') THEN
    -- Update invitation to accepted anyway
    UPDATE public.team_invitations SET status = 'accepted' WHERE id = _invitation.id;
    RETURN jsonb_build_object('success', true, 'message', 'Already a team member');
  END IF;

  -- If this invitation replaces an existing member, handle the replacement
  IF _invitation.replaces_member_id IS NOT NULL THEN
    -- Get the user_id of the member being replaced
    SELECT user_id INTO _replaced_user_id
    FROM public.team_members
    WHERE id = _invitation.replaces_member_id;

    IF _replaced_user_id IS NOT NULL THEN
      -- Calculate how old the replaced member's account is
      SELECT EXTRACT(DAY FROM (NOW() - created_at))::integer INTO _account_age_days
      FROM public.profiles
      WHERE id = _replaced_user_id;

      -- Remove the replaced member from the team
      DELETE FROM public.team_members
      WHERE id = _invitation.replaces_member_id;

      -- Update the replaced member's subscription based on account age
      IF _account_age_days > 30 THEN
        -- Account is over 30 days old - lock it (canceled status)
        UPDATE public.subscriptions
        SET plan_type = 'free',
            status = 'canceled',
            trial_end = NULL
        WHERE user_id = _replaced_user_id;
        
        RAISE LOG '[accept_team_invitation] Replaced member % locked (account % days old)', _replaced_user_id, _account_age_days;
      ELSE
        -- Within 30 days - give them remaining trial time
        SELECT created_at + INTERVAL '30 days' INTO _original_trial_end
        FROM public.profiles
        WHERE id = _replaced_user_id;

        UPDATE public.subscriptions
        SET plan_type = 'free',
            status = 'trial',
            trial_end = _original_trial_end
        WHERE user_id = _replaced_user_id;
        
        RAISE LOG '[accept_team_invitation] Replaced member % reverted to trial (account % days old, trial ends %)', _replaced_user_id, _account_age_days, _original_trial_end;
      END IF;
    END IF;
  END IF;

  -- Update invitation status to accepted
  UPDATE public.team_invitations
  SET status = 'accepted'
  WHERE id = _invitation.id;

  -- Add user as team member
  INSERT INTO public.team_members (team_id, user_id, role, status)
  VALUES (_invitation.team_id, _user_id, 'member', 'active')
  ON CONFLICT (team_id, user_id) DO UPDATE SET status = 'active', role = 'member';

  -- Update subscription to 'team_member' status
  UPDATE public.subscriptions
  SET plan_type = 'team_member',
      status = 'active',
      trial_end = NULL
  WHERE user_id = _user_id;

  RAISE LOG '[accept_team_invitation] User % accepted invitation to team %, replaced member: %', _user_id, _invitation.team_id, _invitation.replaces_member_id;

  RETURN jsonb_build_object('success', true, 'team_id', _invitation.team_id, 'message', 'Invitation accepted successfully');
END;
$function$;