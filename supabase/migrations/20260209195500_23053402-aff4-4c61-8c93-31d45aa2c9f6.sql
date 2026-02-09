-- Fix: on_profile_created_accept_invitations must also set account_state to 'live'
-- for new users who sign up via a team invitation

CREATE OR REPLACE FUNCTION public.on_profile_created_accept_invitations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _invitation RECORD;
  _replaced_user_id uuid;
  _account_age_days integer;
  _original_trial_end timestamp with time zone;
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
    -- If this invitation replaces an existing member, handle the replacement
    IF _invitation.replaces_member_id IS NOT NULL THEN
      SELECT user_id INTO _replaced_user_id
      FROM public.team_members
      WHERE id = _invitation.replaces_member_id;

      IF _replaced_user_id IS NOT NULL THEN
        SELECT EXTRACT(DAY FROM (NOW() - created_at))::integer INTO _account_age_days
        FROM public.profiles
        WHERE id = _replaced_user_id;

        DELETE FROM public.team_members
        WHERE id = _invitation.replaces_member_id;

        IF _account_age_days > 30 THEN
          UPDATE public.subscriptions
          SET plan_type = 'free',
              status = 'canceled',
              trial_end = NULL
          WHERE user_id = _replaced_user_id;
          
          RAISE LOG '[on_profile_created_accept_invitations] Replaced member % locked (account % days old)', _replaced_user_id, _account_age_days;
        ELSE
          SELECT created_at + INTERVAL '30 days' INTO _original_trial_end
          FROM public.profiles
          WHERE id = _replaced_user_id;

          UPDATE public.subscriptions
          SET plan_type = 'free',
              status = 'trial',
              trial_end = _original_trial_end
          WHERE user_id = _replaced_user_id;
          
          RAISE LOG '[on_profile_created_accept_invitations] Replaced member % reverted to trial (account % days old, trial ends %)', _replaced_user_id, _account_age_days, _original_trial_end;
        END IF;
      END IF;
    END IF;

    -- Update invitation status to accepted
    UPDATE public.team_invitations
    SET status = 'accepted'
    WHERE id = _invitation.id;

    -- Add user as team member
    INSERT INTO public.team_members (team_id, user_id, role, status)
    VALUES (_invitation.team_id, NEW.id, 'member', 'active')
    ON CONFLICT (team_id, user_id) DO NOTHING;

    -- Update subscription to 'team_member' status
    UPDATE public.subscriptions
    SET plan_type = 'team_member',
        status = 'active',
        trial_end = NULL
    WHERE user_id = NEW.id;

    -- CRITICAL: Set account_state to 'live' so team member sees real data, not demo
    -- Use NEW.id since this is an AFTER INSERT trigger on profiles
    UPDATE public.profiles
    SET account_state = 'live'
    WHERE id = NEW.id;

    RAISE LOG '[on_profile_created_accept_invitations] User % accepted invitation to team %, set to live mode, replaced member: %', NEW.id, _invitation.team_id, _invitation.replaces_member_id;
  END IF;

  RETURN NEW;
END;
$function$;