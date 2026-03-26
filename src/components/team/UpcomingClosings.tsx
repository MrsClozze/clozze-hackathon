import React from "react";
import BentoCard from "@/components/dashboard/BentoCard";
import { Calendar, MapPin } from "lucide-react";
import { exampleUpcomingClosings } from "@/data/teamExampleData";

export default function UpcomingClosings() {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <BentoCard
      title="Upcoming Closings"
      subtitle={`${exampleUpcomingClosings.length} scheduled`}
    >
      <div className="space-y-3">
        {exampleUpcomingClosings.map((closing) => (
          <div
            key={closing.id}
            className="flex items-center gap-3 p-4 rounded-lg bg-background/50 border border-card-border hover:border-accent-gold/30 transition-colors"
          >
            <div className="p-2 rounded-lg bg-success/10">
              <Calendar className="h-5 w-5 text-success" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-text-heading text-sm">
                {closing.address}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <MapPin className="h-3 w-3 text-text-muted" />
                <span className="text-xs text-text-muted">{closing.city}</span>
              </div>
              <p className="text-xs text-text-muted mt-1">{closing.agent}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-text-heading text-sm">
                {formatCurrency(closing.price)}
              </p>
              <p className="text-xs text-text-muted mt-1">
                {formatDate(closing.closingDate)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </BentoCard>
  );
}