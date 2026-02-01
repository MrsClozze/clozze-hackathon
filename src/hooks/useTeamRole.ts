import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface TeamRoleInfo {
  isTeamOwner: boolean;
  isTeamMember: boolean;
  teamId: string | null;
  teamOwnerId: string | null;
  role: string | null;
  loading: boolean;
}

export function useTeamRole() {
  const { user, subscription } = useAuth();
  const [roleInfo, setRoleInfo] = useState<TeamRoleInfo>({
    isTeamOwner: false,
    isTeamMember: false,
    teamId: null,
    teamOwnerId: null,
    role: null,
    loading: true,
  });

  useEffect(() => {
    async function fetchTeamRole() {
      if (!user) {
        setRoleInfo(prev => ({ ...prev, loading: false }));
        return;
      }

      try {
        // Check if user owns any teams
        const { data: ownedTeams, error: ownedError } = await supabase
          .from("teams")
          .select("id")
          .eq("created_by", user.id)
          .limit(1);

        if (ownedError) throw ownedError;

        if (ownedTeams && ownedTeams.length > 0) {
          // User is a team owner
          setRoleInfo({
            isTeamOwner: true,
            isTeamMember: false,
            teamId: ownedTeams[0].id,
            teamOwnerId: user.id,
            role: "owner",
            loading: false,
          });
          return;
        }

        // Check if user is a member of any team (but not the owner)
        const { data: memberships, error: memberError } = await supabase
          .from("team_members")
          .select("id, team_id, role, team:teams(id, created_by)")
          .eq("user_id", user.id)
          .eq("status", "active")
          .limit(1);

        if (memberError) throw memberError;

        if (memberships && memberships.length > 0) {
          const membership = memberships[0];
          const team = membership.team as { id: string; created_by: string } | null;
          
          // Check if user is the team creator (owner)
          if (team && team.created_by === user.id) {
            setRoleInfo({
              isTeamOwner: true,
              isTeamMember: false,
              teamId: team.id,
              teamOwnerId: user.id,
              role: "owner",
              loading: false,
            });
          } else {
            // User is a team member (not the owner)
            setRoleInfo({
              isTeamOwner: false,
              isTeamMember: true,
              teamId: team?.id || null,
              teamOwnerId: team?.created_by || null,
              role: membership.role,
              loading: false,
            });
          }
          return;
        }

        // User is not part of any team
        // Check if they have a team_member subscription (invited but team might be missing)
        const planType = subscription?.plan_type as string | undefined;
        const isTeamMemberSubscription = planType === 'team_member';
        
        setRoleInfo({
          isTeamOwner: false,
          isTeamMember: isTeamMemberSubscription,
          teamId: null,
          teamOwnerId: null,
          role: isTeamMemberSubscription ? 'member' : null,
          loading: false,
        });
      } catch (error) {
        console.error("Error fetching team role:", error);
        setRoleInfo(prev => ({ ...prev, loading: false }));
      }
    }

    fetchTeamRole();
  }, [user, subscription?.plan_type]);

  return roleInfo;
}
