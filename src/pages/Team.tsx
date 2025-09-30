import React from "react";
import Layout from "@/components/layout/Layout";
import TeamStatsOverview from "@/components/team/TeamStatsOverview";
import ExampleBanner from "@/components/team/ExampleBanner";
import RecentActivityFeed from "@/components/team/RecentActivityFeed";
import UpcomingClosings from "@/components/team/UpcomingClosings";
import TeamDealPipeline from "@/components/team/TeamDealPipeline";
import AgentPerformance from "@/components/team/AgentPerformance";
import LockedTeamKPIs from "@/components/team/LockedTeamKPIs";
import { Users, Building, User } from "lucide-react";
import BentoCard from "@/components/dashboard/BentoCard";
import { exampleTeamStats, exampleListings, exampleBuyers } from "@/data/teamExampleData";
import { useAuth } from "@/contexts/AuthContext";
import { usePersonalData } from "@/hooks/usePersonalData";
import { useTeamData } from "@/hooks/useTeamData";
import { Separator } from "@/components/ui/separator";

export default function Team() {
  const { subscription } = useAuth();
  const { stats: personalStats, loading: personalLoading } = usePersonalData();
  const { stats: teamStats, loading: teamLoading } = useTeamData();

  // Check if user has access to Team KPIs (Pro or Team plan with active status)
  const hasTeamAccess = subscription?.plan_type === 'pro' || subscription?.plan_type === 'team';
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
            <h1 className="text-3xl font-bold text-text-heading">Performance Dashboard</h1>
          </div>
          <p className="text-text-muted">
            View your personal performance and team-wide analytics
          </p>
        </div>

        {/* Example Banner */}
        <ExampleBanner />

        <div className="space-y-8">
          {/* Personal KPIs Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <User className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold text-text-heading">Personal KPIs</h2>
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

          {/* Team KPIs Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold text-text-heading">Team KPIs</h2>
              {isTrialOrFree && (
                <span className="px-3 py-1 rounded-full bg-warning/10 text-warning text-xs font-medium">
                  Upgrade Required
                </span>
              )}
            </div>

            {isTrialOrFree ? (
              <div className="animate-slide-up">
                <LockedTeamKPIs />
              </div>
            ) : (
              <>
                {/* Team Stats Overview */}
                <div className="animate-slide-up">
                  <TeamStatsOverview stats={teamStats} />
                </div>

                {/* Deal Pipeline */}
                <div className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
                  <TeamDealPipeline />
                </div>

                {/* Agent Performance */}
                <div className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
                  <AgentPerformance />
                </div>

                {/* Active Overview - Listings and Buyers */}
                <div className="grid grid-cols-2 gap-bento animate-slide-up" style={{ animationDelay: "0.3s" }}>
                  <BentoCard title="Team Active Listings" subtitle={`${exampleListings.length} total`}>
                    <div className="space-y-3">
                      {exampleListings.map((listing) => (
                        <div
                          key={listing.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-card-border hover:border-accent-gold/30 transition-colors"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-text-heading text-sm">
                              {listing.address}
                            </p>
                            <p className="text-xs text-text-muted">{listing.city}</p>
                            <p className="text-xs text-text-muted mt-1">{listing.agent}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-text-heading text-sm">
                              {formatCurrency(listing.price)}
                            </p>
                            <span className={`text-xs px-2 py-1 rounded ${
                              listing.status === "Active" 
                                ? "bg-success/10 text-success" 
                                : "bg-warning/10 text-warning"
                            }`}>
                              {listing.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </BentoCard>

                  <BentoCard title="Team Active Buyers" subtitle={`${exampleBuyers.length} total`}>
                    <div className="space-y-3">
                      {exampleBuyers.map((buyer) => (
                        <div
                          key={buyer.id}
                          className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-card-border hover:border-accent-gold/30 transition-colors"
                        >
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-text-heading text-sm">
                              {buyer.name}
                            </p>
                            <p className="text-xs text-text-muted truncate">{buyer.email}</p>
                            <p className="text-xs text-text-muted mt-1">{buyer.agent}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-text-heading text-xs">
                              {formatCurrency(buyer.budget)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </BentoCard>
                </div>

                {/* Recent Activity and Upcoming Closings */}
                <div className="grid grid-cols-2 gap-bento animate-slide-up" style={{ animationDelay: "0.4s" }}>
                  <RecentActivityFeed />
                  <UpcomingClosings />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}