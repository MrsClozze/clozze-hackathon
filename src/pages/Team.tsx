import React, { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import TeamStatsOverview from "@/components/team/TeamStatsOverview";
import LockedTeamKPIs from "@/components/team/LockedTeamKPIs";
import LockedTeamMembers from "@/components/team/LockedTeamMembers";
import UnlockedTeamMembers from "@/components/team/UnlockedTeamMembers";
import TeamOnboardingModal from "@/components/team/TeamOnboardingModal";
import TeamTourSlideshow from "@/components/team/TeamTourSlideshow";
import { Users, User } from "lucide-react";
import BentoCard from "@/components/dashboard/BentoCard";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/contexts/UserContext";
import { usePersonalData } from "@/hooks/usePersonalData";
import { useTeamData } from "@/hooks/useTeamData";
import { useTeamMemberSlots } from "@/hooks/useTeamMemberSlots";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function Team() {
  const { subscription, user, refreshSubscription, loading: authLoading } = useAuth();
  const { refreshUser } = useUser();
  const { stats: personalStats, loading: personalLoading } = usePersonalData();
  const { stats: teamStats, loading: teamLoading } = useTeamData();
  const { hasTeamMemberAccess, totalSlots, loading: slotsLoading, refetch: refetchSlots } = useTeamMemberSlots();
  
  // Combined loading state for team members section
  const teamMembersLoading = slotsLoading || authLoading;
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("ytd");
  const { toast } = useToast();

  // Check if user has Pro/Team/Enterprise plan (can add team members)
  const hasProPlan = subscription?.plan_type === 'pro' || 
    subscription?.plan_type === 'team' || 
    (subscription?.plan_type as string) === 'enterprise';

  // Refresh subscription + slots + user profile when returning from checkout
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('session_id') || urlParams.get('checkout_success')) {
      // Clear URL params first
      window.history.replaceState({}, '', window.location.pathname);

      // Immediately refresh all relevant data
      const refreshAll = async () => {
        await Promise.all([
          refreshSubscription(),
          refetchSlots(),
          refreshUser(),
        ]);
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
  }, [refreshSubscription, refetchSlots, refreshUser, toast]);

  useEffect(() => {
    async function checkOnboarding() {
      if (!user) return;

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('team_onboarding_completed')
          .eq('id', user.id)
          .single();

        if (profile && !profile.team_onboarding_completed) {
          setShowOnboarding(true);
        }
      } catch (error) {
        console.error('Error checking team onboarding:', error);
      }
    }

    checkOnboarding();
  }, [user]);

  const handleOnboardingComplete = async () => {
    if (!user) return;

    try {
      await supabase
        .from('profiles')
        .update({ team_onboarding_completed: true })
        .eq('id', user.id);

      setShowOnboarding(false);
    } catch (error) {
      console.error('Error updating team onboarding:', error);
      toast({
        title: "Error",
        description: "Failed to save onboarding status",
        variant: "destructive",
      });
    }
  };

  const handleSeeTour = () => {
    setShowOnboarding(false);
    setShowTour(true);
  };

  const handleCloseTour = async () => {
    setShowTour(false);
    
    // Mark onboarding as completed when tour is closed
    if (user) {
      try {
        await supabase
          .from('profiles')
          .update({ team_onboarding_completed: true })
          .eq('id', user.id);
      } catch (error) {
        console.error('Error updating team onboarding:', error);
      }
    }
  };

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
      <TeamOnboardingModal 
        isOpen={showOnboarding}
        onGotIt={handleOnboardingComplete}
        onSeeTour={handleSeeTour}
      />
      
      <TeamTourSlideshow 
        isOpen={showTour}
        onClose={handleCloseTour}
      />
      
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
              {!hasProPlan && !teamMembersLoading && (
                <span className="px-3 py-1 rounded-full bg-warning/10 text-warning text-xs font-medium">
                  Upgrade Required
                </span>
              )}
            </div>

            {teamMembersLoading ? (
              <div className="space-y-6 animate-slide-up">
                <div className="bg-card rounded-xl border border-card-border p-8">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                </div>
              </div>
            ) : hasProPlan ? (
              <div className="space-y-6 animate-slide-up">
                <UnlockedTeamMembers />
              </div>
            ) : (
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