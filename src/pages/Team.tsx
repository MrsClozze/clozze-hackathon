import Layout from "@/components/layout/Layout";
import { useTeamData } from "@/hooks/useTeamData";
import TeamStatsOverview from "@/components/team/TeamStatsOverview";
import TeamActiveOverview from "@/components/team/TeamActiveOverview";
import { Users, Loader2 } from "lucide-react";

export default function Team() {
  const { stats, loading, error } = useTeamData();

  return (
    <Layout>
      <div className="p-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Users className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-text-heading">Team Dashboard</h1>
          </div>
          <p className="text-text-muted">
            Aggregate performance metrics and activity across your entire team
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-500">{error}</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Stats Overview */}
            <div className="animate-slide-up">
              <TeamStatsOverview stats={stats} />
            </div>

            {/* Active Overview */}
            <div className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
              <TeamActiveOverview />
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}