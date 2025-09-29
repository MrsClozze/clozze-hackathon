import { Plus, User, DollarSign } from "lucide-react";
import BentoCard from "./BentoCard";
import { Button } from "@/components/ui/button";

const activeBuyers = [
  {
    id: 1,
    name: "Sarah Johnson",
    budget: 850000,
    status: "Pre-approved",
    priority: "high",
    lastContact: "2 days ago",
    expectedCommission: 25500,
  },
  {
    id: 2,
    name: "Mike & Lisa Chen",
    budget: 1200000,
    status: "Searching",
    priority: "medium",
    lastContact: "1 week ago",
    expectedCommission: 36000,
  },
  {
    id: 3,
    name: "Robert Williams",
    budget: 2500000,
    status: "Under Contract",
    priority: "high",
    lastContact: "1 day ago",
    expectedCommission: 75000,
  },
];

export default function ActiveBuyersCard() {
  return (
    <BentoCard
      title="Active Buyers"
      subtitle="Your current buyer clients"
      action={
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Buyer
        </Button>
      }
      className="col-span-2"
    >
      <div className="space-y-4">
        {activeBuyers.map((buyer) => (
          <div
            key={buyer.id}
            className="flex items-center justify-between p-4 rounded-lg bg-background-elevated border border-card-border hover:border-accent-gold/30 transition-all duration-200 cursor-pointer group"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-accent-gold" />
                <h4 className="font-medium text-text-heading group-hover:text-accent-gold transition-colors">
                  {buyer.name}
                </h4>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  buyer.status === 'Pre-approved' 
                    ? 'bg-success/20 text-success' 
                    : buyer.status === 'Under Contract'
                    ? 'bg-warning/20 text-warning'
                    : 'bg-secondary/50 text-text-body'
                }`}>
                  {buyer.status}
                </span>
                <span className={`w-2 h-2 rounded-full ${
                  buyer.priority === 'high' ? 'bg-destructive' : 'bg-warning'
                }`} />
              </div>
              <p className="text-sm text-text-muted">
                Budget: ${buyer.budget.toLocaleString()}
              </p>
              <p className="text-xs text-text-subtle mt-1">
                Last contact: {buyer.lastContact}
              </p>
            </div>
            
            <div className="text-right">
              <div className="flex items-center gap-1 text-sm font-medium text-accent-gold mb-1">
                <DollarSign className="h-3 w-3" />
                Expected: ${buyer.expectedCommission.toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </BentoCard>
  );
}