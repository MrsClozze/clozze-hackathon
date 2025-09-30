import React from "react";
import { Building, Users, DollarSign, TrendingUp } from "lucide-react";
import BentoCard from "@/components/dashboard/BentoCard";
import { TeamStats } from "@/hooks/useTeamData";

interface TeamStatsOverviewProps {
  stats: TeamStats;
}

export default function TeamStatsOverview({ stats }: TeamStatsOverviewProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const statCards = [
    {
      label: "Active Listings",
      value: stats.activeListings.toString(),
      change: `${stats.totalListings} total`,
      icon: Building,
      color: "text-success",
    },
    {
      label: "Active Buyers",
      value: stats.activeBuyers.toString(),
      change: `${stats.totalBuyers} total`,
      icon: Users,
      color: "text-warning",
    },
    {
      label: "Total Sales Volume",
      value: formatCurrency(stats.totalSalesVolume),
      change: `${stats.closedListings} closed deals`,
      icon: TrendingUp,
      color: "text-accent-gold",
    },
    {
      label: "Total Commission",
      value: formatCurrency(stats.totalCommission),
      change: formatCurrency(stats.avgCommission) + " avg",
      icon: DollarSign,
      color: "text-success",
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-bento">
      {statCards.map((stat, index) => (
        <BentoCard key={index}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-text-heading mb-1">
                {stat.value}
              </p>
              <p className="text-sm font-medium text-text-body">
                {stat.label}
              </p>
              <p className={`text-xs mt-1 ${stat.color}`}>
                {stat.change}
              </p>
            </div>
            <stat.icon className={`h-8 w-8 ${stat.color} opacity-80`} />
          </div>
        </BentoCard>
      ))}
    </div>
  );
}