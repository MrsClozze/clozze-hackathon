import React from "react";
import BentoCard from "@/components/dashboard/BentoCard";
import { TrendingUp, FileText, CheckCircle, XCircle } from "lucide-react";
import { exampleDealPipeline } from "@/data/teamExampleData";

export default function TeamDealPipeline() {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const pipeline = [
    {
      label: "In Prospect",
      value: exampleDealPipeline.inProspect,
      icon: FileText,
      color: "text-blue-400",
      bgColor: "bg-blue-400/10",
    },
    {
      label: "Under Contract",
      value: exampleDealPipeline.underContract,
      icon: TrendingUp,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      label: "Closed/Won",
      value: exampleDealPipeline.closedWon,
      icon: CheckCircle,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      label: "Lost Deals",
      value: exampleDealPipeline.lostDeals,
      icon: XCircle,
      color: "text-red-400",
      bgColor: "bg-red-400/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-bento">
      <BentoCard
        title="Deal Pipeline Overview"
        subtitle="Current pipeline status"
      >
        <div className="grid grid-cols-2 gap-4">
          {pipeline.map((item, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg ${item.bgColor} border border-card-border`}
            >
              <div className="flex items-center gap-2 mb-2">
                <item.icon className={`h-5 w-5 ${item.color}`} />
                <span className="text-sm font-medium text-text-body">
                  {item.label}
                </span>
              </div>
              <p className={`text-2xl font-bold ${item.color}`}>
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </BentoCard>

      <BentoCard
        title="Forecasted Revenue"
        subtitle="Total pipeline value"
      >
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <TrendingUp className="h-12 w-12 text-accent-gold mx-auto mb-3" />
            <p className="text-4xl font-bold text-text-heading mb-2">
              {formatCurrency(exampleDealPipeline.forecastedRevenue)}
            </p>
            <p className="text-sm text-text-muted">
              Expected from {exampleDealPipeline.inProspect + exampleDealPipeline.underContract} active deals
            </p>
          </div>
        </div>
      </BentoCard>
    </div>
  );
}