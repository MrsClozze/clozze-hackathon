import React from "react";
import BentoCard from "@/components/dashboard/BentoCard";
import { Activity, Home, Users, Eye, FileText, Calendar } from "lucide-react";
import { exampleRecentActivity } from "@/data/teamExampleData";

export default function RecentActivityFeed() {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "listing":
        return Home;
      case "buyer":
        return Users;
      case "showing":
        return Eye;
      case "offer":
        return FileText;
      case "closing":
        return Calendar;
      default:
        return Activity;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "listing":
        return "text-success bg-success/10";
      case "buyer":
        return "text-primary bg-primary/10";
      case "showing":
        return "text-warning bg-warning/10";
      case "offer":
        return "text-accent-gold bg-accent-gold/10";
      case "closing":
        return "text-blue-400 bg-blue-400/10";
      default:
        return "text-text-muted bg-background";
    }
  };

  return (
    <BentoCard
      title="Recent Team Activity"
      subtitle="Latest actions across all agents"
    >
      <div className="space-y-3">
        {exampleRecentActivity.map((activity) => {
          const Icon = getActivityIcon(activity.type);
          const colorClasses = getActivityColor(activity.type);

          return (
            <div
              key={activity.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-card-border hover:border-accent-gold/30 transition-colors"
            >
              <div className={`p-2 rounded-lg ${colorClasses}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-text-heading text-sm">
                  {activity.message}
                </p>
                <p className="text-xs text-text-muted truncate">
                  {activity.details}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-text-muted">
                    {activity.agent}
                  </span>
                  <span className="text-xs text-text-muted/60">•</span>
                  <span className="text-xs text-text-muted/60">
                    {activity.timestamp}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </BentoCard>
  );
}