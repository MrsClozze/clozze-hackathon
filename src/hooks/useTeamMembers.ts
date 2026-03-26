import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface TeamMemberOption {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
}

export function useTeamMembers() {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMemberOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTeamMembers() {
      if (!user) {
        setTeamMembers([]);
        setLoading(false);
        return;
      }

      try {
        // Get teams where user is a member
        const { data: userTeams, error: teamsError } = await supabase
          .from("team_members")
          .select("team_id")
          .eq("user_id", user.id)
          .eq("status", "active");

        if (teamsError) throw teamsError;

        if (!userTeams || userTeams.length === 0) {
          setTeamMembers([]);
          setLoading(false);
          return;
        }

        const teamIds = userTeams.map((t) => t.team_id);

        // Get all team members from those teams
        const { data: members, error: membersError } = await supabase
          .from("team_members")
          .select("id, user_id, role")
          .in("team_id", teamIds)
          .eq("status", "active");

        if (membersError) throw membersError;

        if (!members || members.length === 0) {
          setTeamMembers([]);
          setLoading(false);
          return;
        }

        // Get profiles for all members
        const userIds = members.map((m) => m.user_id);
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email")
          .in("id", userIds);

        if (profilesError) throw profilesError;

        const mappedMembers: TeamMemberOption[] = members.map((member) => {
          const profile = profiles?.find((p) => p.id === member.user_id);
          const name = profile?.first_name && profile?.last_name
            ? `${profile.first_name} ${profile.last_name}`
            : profile?.email || "Unknown";

          return {
            id: member.id,
            userId: member.user_id,
            name,
            email: profile?.email || "",
            role: member.role,
          };
        });

        setTeamMembers(mappedMembers);
      } catch (error) {
        console.error("Error fetching team members:", error);
        setTeamMembers([]);
      } finally {
        setLoading(false);
      }
    }

    fetchTeamMembers();
  }, [user]);

  return { teamMembers, loading };
}
