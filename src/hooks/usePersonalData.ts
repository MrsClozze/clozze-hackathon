import { useEffect, useState, useMemo } from "react";
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

interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Converts a period string to a date range for the current year.
 * Uses local date components to avoid UTC timezone shift issues.
 */
function getDateRangeFromPeriod(period: string): DateRange | null {
  const now = new Date();
  const currentYear = now.getFullYear();
  
  const monthMap: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };

  if (period === "ytd") {
    // Year to date: from Jan 1 to now
    return {
      start: new Date(currentYear, 0, 1),
      end: now,
    };
  }

  const monthIndex = monthMap[period];
  if (monthIndex !== undefined) {
    // First day of the selected month
    const start = new Date(currentYear, monthIndex, 1);
    // Last day of the selected month
    const end = new Date(currentYear, monthIndex + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }

  return null;
}

/**
 * Formats a Date to YYYY-MM-DD string using local date components.
 * This avoids timezone issues that can occur with toISOString().
 */
function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function usePersonalData(period: string = "ytd") {
  const [listings, setListings] = useState<any[]>([]);
  const [buyers, setBuyers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all data once
  useEffect(() => {
    async function fetchPersonalData() {
      try {
        setLoading(true);
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error("User not authenticated");
        }

        // Fetch all listings for current user
        const { data: listingsData, error: listingsError } = await supabase
          .from("listings")
          .select("*")
          .eq("user_id", user.id);

        if (listingsError) throw listingsError;

        // Fetch all buyers for current user
        const { data: buyersData, error: buyersError } = await supabase
          .from("buyers")
          .select("*")
          .eq("user_id", user.id);

        if (buyersError) throw buyersError;

        setListings(listingsData || []);
        setBuyers(buyersData || []);
      } catch (err) {
        console.error("Error fetching personal data:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch personal data");
      } finally {
        setLoading(false);
      }
    }

    fetchPersonalData();
  }, []);

  // Compute stats based on period filter
  const stats = useMemo<PersonalStats>(() => {
    const dateRange = getDateRangeFromPeriod(period);
    
    // Filter by created_at date range
    const filterByDate = <T extends { created_at: string }>(items: T[]): T[] => {
      if (!dateRange) return items;
      
      return items.filter((item) => {
        if (!item.created_at) return false;
        const itemDate = new Date(item.created_at);
        return itemDate >= dateRange.start && itemDate <= dateRange.end;
      });
    };

    const filteredListings = filterByDate(listings);
    const filteredBuyers = filterByDate(buyers);

    const activeListings = filteredListings.filter((l) => l.status === "Active");
    const pendingListings = filteredListings.filter((l) => l.status === "Pending");
    const closedListings = filteredListings.filter((l) => l.status === "Closed");
    const activeBuyers = filteredBuyers.filter((b) => b.status === "Active");

    const totalSalesVolume = closedListings.reduce(
      (sum, l) => sum + Number(l.price || 0),
      0
    );

    // Calculate listing commissions from stored agent_commission
    const listingCommissions = filteredListings.reduce(
      (sum, l) => sum + Number(l.agent_commission || 0),
      0
    );

    // Calculate buyer commissions dynamically using 50/50 split logic
    // Total commission = pre_approved_amount * (commission_percentage / 100)
    // Agent commission = Total commission * 0.5 (50/50 split)
    const buyerCommissions = filteredBuyers.reduce((sum, b) => {
      const preApproved = Number(b.pre_approved_amount || 0);
      const commPct = Number(b.commission_percentage || 0);
      const totalComm = preApproved * (commPct / 100);
      const agentComm = totalComm * 0.5; // 50/50 split
      return sum + agentComm;
    }, 0);

    const totalCommission = listingCommissions + buyerCommissions;

    const totalItems = filteredListings.length + filteredBuyers.length;
    const avgCommission = totalItems > 0 ? totalCommission / totalItems : 0;

    return {
      totalListings: filteredListings.length,
      activeListings: activeListings.length,
      pendingListings: pendingListings.length,
      closedListings: closedListings.length,
      totalBuyers: filteredBuyers.length,
      activeBuyers: activeBuyers.length,
      totalSalesVolume,
      totalCommission,
      avgCommission,
    };
  }, [listings, buyers, period]);

  return { stats, loading, error };
}
