import React, { useState, useEffect, useRef } from "react";
import Layout from "@/components/layout/Layout";
import TeamStatsOverview from "@/components/team/TeamStatsOverview";
import LockedTeamKPIs from "@/components/team/LockedTeamKPIs";
import { supabase } from "@/integrations/supabase/client";
import LockedTeamMembers from "@/components/team/LockedTeamMembers";
import UnlockedTeamMembers from "@/components/team/UnlockedTeamMembers";
import TeamMemberView from "@/components/team/TeamMemberView";
import { Users, User } from "lucide-react";
import BentoCard from "@/components/dashboard/BentoCard";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/contexts/UserContext";
import { usePersonalData } from "@/hooks/usePersonalData";
import { useTeamData } from "@/hooks/useTeamData";
import { useTeamMemberSlots } from "@/hooks/useTeamMemberSlots";
import { useTeamRole } from "@/hooks/useTeamRole";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { trackPurchase } from "@/lib/analytics";

export default function Team() {
  const { subscription, user, refreshSubscription, loading: authLoading } = useAuth();
  const { refreshUser } = useUser();
  const { stats: personalStats, loading: personalLoading } = usePersonalData();
  const { stats: teamStats, loading: teamLoading } = useTeamData();
  const { hasTeamMemberAccess, totalSlots, loading: slotsLoading, refetch: refetchSlots } = useTeamMemberSlots();
  const { isTeamOwner, isTeamMember, teamOwnerId, loading: roleLoading } = useTeamRole();
  
  // Combined loading state: don't block the whole page on subscription resolving.
  // If subscription fails to load for any reason, we'll render the locked state instead of spinning forever.
  const teamMembersLoading = slotsLoading || authLoading || roleLoading;
  const [selectedPeriod, setSelectedPeriod] = useState("ytd");
  const { toast } = useToast();

  // Check if user has Pro/Team/Enterprise plan OR is a team member (can view team)
  const planType = subscription?.plan_type as string | undefined;
  const hasProPlan = planType === 'pro' || 
    planType === 'team' || 
    planType === 'enterprise';

  // Track if we've already fired the purchase event to prevent duplicates
  const purchaseTrackedRef = useRef(false);

  // Process pending invitation after checkout
  const processPendingInvitation = async () => {
    const pendingInviteStr = sessionStorage.getItem('pendingTeamInvite');
    if (!pendingInviteStr || !user) return;
    
    try {
      const { firstName, lastName, email } = JSON.parse(pendingInviteStr);
      sessionStorage.removeItem('pendingTeamInvite');
      
      // Get or create user's team
      let teamId: string;
      const { data: existingTeam } = await supabase
        .from('teams')
        .select('id')
        .eq('created_by', user.id)
        .single();

      if (existingTeam) {
        teamId = existingTeam.id;
      } else {
        const { data: newTeam, error: teamError } = await supabase
          .from('teams')
          .insert({ name: 'My Team', created_by: user.id })
          .select()
          .single();
        if (teamError) throw teamError;
        teamId = newTeam.id;
      }

      // Create invitation
      const { data: invitation, error: inviteError } = await supabase
        .from('team_invitations')
        .insert({
          team_id: teamId,
          email,
          first_name: firstName,
          last_name: lastName,
          invited_by: user.id,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select('token')
        .single();

      if (inviteError) throw inviteError;

      // Get inviter's profile
      const { data: inviterProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single();

      const inviterName = inviterProfile?.first_name && inviterProfile?.last_name
        ? `${inviterProfile.first_name} ${inviterProfile.last_name}`
        : user.email?.split('@')[0] || 'A team owner';

      // Send email
      await supabase.functions.invoke('send-team-invitation-email', {
        body: {
          inviteeEmail: email,
          inviteeFirstName: firstName,
          inviteeLastName: lastName,
          inviterName,
          invitationToken: invitation.token,
        },
      });

      toast({
        title: "Invitation Sent",
        description: `An invitation has been sent to ${email}.`,
      });
    } catch (error) {
      console.error('Error processing pending invitation:', error);
    }
  };

  // Refresh subscription + slots + user profile when returning from checkout
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const checkoutSuccess = urlParams.get('checkout_success');
    const slotsParam = urlParams.get('slots');
    
    if (urlParams.get('session_id') || checkoutSuccess) {
      // Track GA4 purchase event for team member slots (only once)
      if (checkoutSuccess === 'true' && slotsParam && !purchaseTrackedRef.current) {
        const slotsCount = parseInt(slotsParam, 10) || 1;
        const purchaseValue = slotsCount * 9.99; // $9.99 per team member slot
        trackPurchase(purchaseValue);
        purchaseTrackedRef.current = true;
      }

      // Clear URL params first
      window.history.replaceState({}, '', window.location.pathname);

      // Immediately refresh all relevant data
      const refreshAll = async () => {
        await Promise.all([
          refreshSubscription(),
          refetchSlots(),
          refreshUser(),
        ]);
        
        // Process any pending invitation after slots are refreshed
        await processPendingInvitation();
        
        toast({
          title: "Account Updated",
          description: "Your subscription information has been refreshed.",
        });
      };

      refreshAll();
      // Retry after 2s in case Stripe webhook hasn't finished yet
      const timer = setTimeout(refreshAll, 2000);
      return () => clearTimeout(timer);
    }
  }, [refreshSubscription, refetchSlots, refreshUser, toast, user]);

  // Check if user has access to Team KPIs (Pro, Team, or Enterprise plan with active status)
  const hasTeamAccess = subscription?.plan_type === 'pro' || 
    subscription?.plan_type === 'team' || 
    (subscription?.plan_type as string) === 'enterprise';
  const isTrialOrFree = !hasTeamAccess || subscription?.status === 'trial';
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Layout>
      <div className="p-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Users className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-text-heading">Dashboard</h1>
          </div>
          <p className="text-text-muted">
            Track your metrics and manage your team
          </p>
        </div>


        <div className="space-y-8">
          {/* Personal Performance Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <User className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold text-text-heading">Personal Performance</h2>
              </div>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ytd">Year to Date</SelectItem>
                  <SelectItem value="jan">January</SelectItem>
                  <SelectItem value="feb">February</SelectItem>
                  <SelectItem value="mar">March</SelectItem>
                  <SelectItem value="apr">April</SelectItem>
                  <SelectItem value="may">May</SelectItem>
                  <SelectItem value="jun">June</SelectItem>
                  <SelectItem value="jul">July</SelectItem>
                  <SelectItem value="aug">August</SelectItem>
                  <SelectItem value="sep">September</SelectItem>
                  <SelectItem value="oct">October</SelectItem>
                  <SelectItem value="nov">November</SelectItem>
                  <SelectItem value="dec">December</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="animate-slide-up">
              <TeamStatsOverview stats={personalStats} />
            </div>

            <div className="grid grid-cols-2 gap-bento animate-slide-up" style={{ animationDelay: "0.1s" }}>
              <BentoCard title="My Active Listings" subtitle={`${personalStats.activeListings} active`}>
                <div className="space-y-3">
                  {personalStats.activeListings === 0 ? (
                    <p className="text-text-muted text-sm">No active listings yet</p>
                  ) : (
                    <p className="text-text-muted text-sm">You have {personalStats.activeListings} active listing{personalStats.activeListings !== 1 ? 's' : ''}</p>
                  )}
                </div>
              </BentoCard>

              <BentoCard title="My Active Buyers" subtitle={`${personalStats.activeBuyers} active`}>
                <div className="space-y-3">
                  {personalStats.activeBuyers === 0 ? (
                    <p className="text-text-muted text-sm">No active buyers yet</p>
                  ) : (
                    <p className="text-text-muted text-sm">You have {personalStats.activeBuyers} active buyer{personalStats.activeBuyers !== 1 ? 's' : ''}</p>
                  )}
                </div>
              </BentoCard>
            </div>
          </div>

          <Separator className="my-8" />

          {/* Team Members Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold text-text-heading">Team Members</h2>
              {!hasProPlan && !isTeamMember && !teamMembersLoading && (
                <span className="px-3 py-1 rounded-full bg-warning/10 text-warning text-xs font-medium">
                  Upgrade Required
                </span>
              )}
              {isTeamMember && !isTeamOwner && (
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  Team Member
                </span>
              )}
            </div>

            {teamMembersLoading ? (
              <div className="space-y-6 animate-slide-up">
                <div className="bg-card rounded-xl border border-card-border p-8">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="text-sm text-text-muted">Loading team data...</p>
                  </div>
                </div>
              </div>
            ) : isTeamMember && !isTeamOwner ? (
              // Team members see read-only view
              <div className="space-y-6 animate-slide-up">
                <TeamMemberView teamOwnerId={teamOwnerId} />
              </div>
            ) : hasProPlan || isTeamOwner ? (
              // Team owners see full management UI
              <div className="space-y-6 animate-slide-up">
                <UnlockedTeamMembers />
              </div>
            ) : (
              // Non-subscribed users see locked view
              <div className="space-y-6 animate-slide-up">
                <LockedTeamKPIs />
                <LockedTeamMembers />
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
