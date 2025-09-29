import { TrendingUp, Users, Building, CheckCircle } from "lucide-react";
import BentoCard from "./BentoCard";

const stats = [
  {
    label: "Active Listings",
    value: "12",
    change: "+2 this week",
    icon: Building,
    color: "text-success",
  },
  {
    label: "Active Buyers", 
    value: "8",
    change: "+1 this week",
    icon: Users,
    color: "text-warning",
  },
  {
    label: "Pending Sales",
    value: "5",
    change: "2 closing soon",
    icon: TrendingUp,
    color: "text-accent-gold",
  },
  {
    label: "Tasks Complete",
    value: "89%",
    change: "This month",
    icon: CheckCircle,
    color: "text-success",
  },
];

export default function StatsOverview() {
  return (
    <div className="grid grid-cols-4 gap-bento">
      {stats.map((stat, index) => (
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