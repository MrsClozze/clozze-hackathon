import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PersonalStats {
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

export function usePersonalData() {
  const [stats, setStats] = useState<PersonalStats>({
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
    async function fetchPersonalData() {
      try {
        setLoading(true);
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error("User not authenticated");
        }

        // Fetch listings for current user only
        const { data: listings, error: listingsError } = await supabase
          .from("listings")
          .select("*")
          .eq("user_id", user.id);

        if (listingsError) throw listingsError;

        // Fetch buyers for current user only
        const { data: buyers, error: buyersError } = await supabase
          .from("buyers")
          .select("*")
          .eq("user_id", user.id);

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
        console.error("Error fetching personal data:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch personal data");
      } finally {
        setLoading(false);
      }
    }

    fetchPersonalData();
  }, []);

  return { stats, loading, error };
}
