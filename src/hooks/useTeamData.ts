import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TeamStats {
  totalListings: number;
  activeListings: number;
  pendingListings: number;
  closedListings: number;
  totalBuyers: number;
  activeBuyers: number;
  totalSalesVolume: number;
  totalCommission: number;
  avgCommission: number;
}

export function useTeamData() {
  const [stats, setStats] = useState<TeamStats>({
    totalListings: 0,
    activeListings: 0,
    pendingListings: 0,
    closedListings: 0,
    totalBuyers: 0,
    activeBuyers: 0,
    totalSalesVolume: 0,
    totalCommission: 0,
    avgCommission: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTeamData() {
      try {
        setLoading(true);
        
        // Get current user's teams
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error("User not authenticated");
        }

        // Get team members (including self)
        const { data: teamMembers, error: teamError } = await supabase
          .from("team_members")
          .select("user_id, team_id")
          .eq("status", "active");

        if (teamError) throw teamError;

        // If user is part of a team, get all team member user_ids
        const teamUserIds = teamMembers?.map(tm => tm.user_id) || [];
        
        // Include current user if they're not in a team
        const userIds = teamUserIds.length > 0 ? teamUserIds : [user.id];

        // Fetch listings for all team members
        const { data: listings, error: listingsError } = await supabase
          .from("listings")
          .select("*")
          .in("user_id", userIds);

        if (listingsError) throw listingsError;

        // Fetch buyers using secure function
        // Note: Financial data (commissions, pre-approval amounts) is only visible to the buyer's owner
        const { data: buyers, error: buyersError } = await supabase
          .rpc("get_team_buyers");

        if (buyersError) throw buyersError;

        // Calculate stats
        const activeListings = listings?.filter(l => l.status === "Active") || [];
        const pendingListings = listings?.filter(l => l.status === "Pending") || [];
        const closedListings = listings?.filter(l => l.status === "Closed") || [];
        const activeBuyers = buyers?.filter(b => b.status === "Active") || [];

        const totalSalesVolume = closedListings.reduce((sum, l) => sum + Number(l.price || 0), 0);
        const totalCommission = [
          ...listings?.map(l => Number(l.agent_commission || 0)) || [],
          ...buyers?.map(b => Number(b.agent_commission || 0)) || []
        ].reduce((sum, c) => sum + c, 0);

        const avgCommission = listings && listings.length > 0 
          ? totalCommission / listings.length 
          : 0;

        setStats({
          totalListings: listings?.length || 0,
          activeListings: activeListings.length,
          pendingListings: pendingListings.length,
          closedListings: closedListings.length,
          totalBuyers: buyers?.length || 0,
          activeBuyers: activeBuyers.length,
          totalSalesVolume,
          totalCommission,
          avgCommission,
        });
      } catch (err) {
        console.error("Error fetching team data:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch team data");
      } finally {
        setLoading(false);
      }
    }

    fetchTeamData();
  }, []);

  return { stats, loading, error };
}