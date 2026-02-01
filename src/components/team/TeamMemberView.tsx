import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import BentoCard from "@/components/dashboard/BentoCard";
import { 
  Users, 
  Mail, 
  CheckCircle,
  User,
  Building2
} from "lucide-react";

interface TeamMember {
  id: string;
  user_id: string;
  team_id: string;
  role: string;
  status: string;
  joined_at: string;
  profile?: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
  taskCount?: number;
}

interface TeamOwnerInfo {
  first_name: string | null;
  last_name: string | null;
  email: string;
  company_name: string | null;
}

interface TeamMemberViewProps {
  teamOwnerId: string | null;
}

export default function TeamMemberView({ teamOwnerId }: TeamMemberViewProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamOwner, setTeamOwner] = useState<TeamOwnerInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTeamData();
    }
  }, [user, teamOwnerId]);

  const fetchTeamData = async () => {
    if (!user) return;
    
    try {
      // Get the team the user is a member of
      const { data: membership, error: membershipError } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .single();

      if (membershipError || !membership) {
        setLoading(false);
        return;
      }

      const teamId = membership.team_id;

      // Fetch team owner info
      if (teamOwnerId) {
        const { data: ownerProfile } = await supabase
          .from("profiles")
          .select("first_name, last_name, email, company_name")
          .eq("id", teamOwnerId)
          .single();

        if (ownerProfile) {
          setTeamOwner(ownerProfile);
        }
      }

      // Get all team members (excluding self)
      const { data: members, error: membersError } = await supabase
        .from("team_members")
        .select("*")
        .eq("team_id", teamId)
        .neq("user_id", user.id);

      if (membersError) throw membersError;

      if (members && members.length > 0) {
        const userIds = members.map(m => m.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email")
          .in("id", userIds);

        const membersWithData = await Promise.all(members.map(async (member) => {
          const profile = profiles?.find(p => p.id === member.user_id);
          
          const { count } = await supabase
            .from("tasks")
            .select("*", { count: "exact", head: true })
            .eq("user_id", member.user_id)
            .eq("status", "pending");

          return {
            ...member,
            profile: profile ? {
              first_name: profile.first_name,
              last_name: profile.last_name,
              email: profile.email,
            } : undefined,
            taskCount: count || 0,
          };
        }));

        setTeamMembers(membersWithData);
      } else {
        setTeamMembers([]);
      }
    } catch (error) {
      console.error("Error fetching team data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewProfile = (member: TeamMember) => {
    navigate(`/team/member/${member.id}`);
  };

  if (loading) {
    return (
      <BentoCard title="Your Team" subtitle="Loading...">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </BentoCard>
    );
  }

  return (
    <BentoCard 
      title="Your Team" 
      subtitle="View your teammates"
    >
      <div className="space-y-4">
        {/* Team Owner Section */}
        {teamOwner && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-text-muted mb-3">Team Owner</h4>
            <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-text-heading">
                      {teamOwner.first_name || 'Unknown'} {teamOwner.last_name || ''}
                    </p>
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary">
                      Owner
                    </span>
                  </div>
                  <p className="text-sm text-text-muted flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {teamOwner.email}
                  </p>
                  {teamOwner.company_name && (
                    <p className="text-sm text-text-muted flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {teamOwner.company_name}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Teammates Section */}
        <div>
          <h4 className="text-sm font-medium text-text-muted mb-3">Teammates</h4>
          {teamMembers.length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No other teammates yet</p>
              <p className="text-sm">You're the first team member!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-background/50 border border-card-border hover:border-primary/30 transition-colors cursor-pointer"
                  onClick={() => handleViewProfile(member)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-text-heading">
                          {member.profile?.first_name || 'Unknown'} {member.profile?.last_name || ''}
                        </p>
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-success/10 text-success flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Active
                        </span>
                      </div>
                      <p className="text-sm text-text-muted flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {member.profile?.email || 'No email'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-text-heading">
                      {member.taskCount} active task{member.taskCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info message */}
        <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-muted">
          <p className="text-sm text-text-muted text-center">
            Team management is handled by your team owner. Contact them if you need changes to your account.
          </p>
        </div>
      </div>
    </BentoCard>
  );
}
