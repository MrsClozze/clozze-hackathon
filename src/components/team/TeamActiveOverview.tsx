import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import BentoCard from "@/components/dashboard/BentoCard";
import { Building, Users, Activity } from "lucide-react";

interface Listing {
  id: string;
  address: string;
  city: string;
  price: number;
  status: string;
}

interface Buyer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
}

export default function TeamActiveOverview() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get team members
        const { data: teamMembers } = await supabase
          .from("team_members")
          .select("user_id")
          .eq("status", "active");

        const userIds = teamMembers?.map(tm => tm.user_id) || [user.id];

        // Fetch active listings
        const { data: listingsData } = await supabase
          .from("listings")
          .select("id, address, city, price, status")
          .in("user_id", userIds)
          .eq("status", "Active")
          .order("created_at", { ascending: false })
          .limit(5);

        // Fetch active buyers using secure function
        // Note: Financial data is only visible to the buyer's owner
        const { data: allBuyers } = await supabase
          .rpc("get_team_buyers");

        // Filter to active buyers and limit
        const buyersData = (allBuyers || [])
          .filter(b => b.status === "Active")
          .slice(0, 5);

        setListings(listingsData || []);
        setBuyers(buyersData || []);
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-2 gap-bento">
      {/* Active Listings */}
      <BentoCard title="Recent Active Listings" subtitle={`${listings.length} active`}>
        <div className="space-y-3">
          {loading ? (
            <p className="text-sm text-text-muted">Loading...</p>
          ) : listings.length === 0 ? (
            <div className="text-center py-8">
              <Building className="h-12 w-12 mx-auto text-text-muted mb-2 opacity-50" />
              <p className="text-sm text-text-muted">No active listings yet</p>
            </div>
          ) : (
            listings.map((listing) => (
              <div
                key={listing.id}
                className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-card-border hover:border-accent-gold/30 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium text-text-heading text-sm">
                    {listing.address}
                  </p>
                  <p className="text-xs text-text-muted">{listing.city}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-text-heading text-sm">
                    {formatCurrency(listing.price)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </BentoCard>

      {/* Active Buyers */}
      <BentoCard title="Recent Active Buyers" subtitle={`${buyers.length} active`}>
        <div className="space-y-3">
          {loading ? (
            <p className="text-sm text-text-muted">Loading...</p>
          ) : buyers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-text-muted mb-2 opacity-50" />
              <p className="text-sm text-text-muted">No active buyers yet</p>
            </div>
          ) : (
            buyers.map((buyer) => (
              <div
                key={buyer.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-card-border hover:border-accent-gold/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-text-heading text-sm">
                    {buyer.first_name} {buyer.last_name}
                  </p>
                  <p className="text-xs text-text-muted">{buyer.email}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </BentoCard>
    </div>
  );
}