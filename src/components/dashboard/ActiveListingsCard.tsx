import { Plus, MapPin, DollarSign } from "lucide-react";
import BentoCard from "./BentoCard";
import { Button } from "@/components/ui/button";

const activeListings = [
  {
    id: 1,
    address: "123 Maple Street",
    city: "Beverly Hills, CA",
    price: 2450000,
    status: "Active",
    daysOnMarket: 14,
    commission: 73500,
  },
  {
    id: 2,
    address: "456 Oak Avenue",
    city: "Malibu, CA",
    price: 5750000,
    status: "Pending",
    daysOnMarket: 7,
    commission: 172500,
  },
  {
    id: 3,
    address: "789 Pine Road",
    city: "Santa Monica, CA",
    price: 1890000,
    status: "Active",
    daysOnMarket: 21,
    commission: 56700,
  },
];

export default function ActiveListingsCard() {
  return (
    <BentoCard
      title="Active Listings"
      subtitle="Your current property listings"
      action={
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Listing
        </Button>
      }
      className="col-span-2"
    >
      <div className="space-y-4">
        {activeListings.map((listing) => (
          <div
            key={listing.id}
            className="flex items-center justify-between p-4 rounded-lg bg-background-elevated border border-card-border hover:border-accent-gold/30 transition-all duration-200 cursor-pointer group"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4 text-accent-gold" />
                <h4 className="font-medium text-text-heading group-hover:text-accent-gold transition-colors">
                  {listing.address}
                </h4>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  listing.status === 'Active' 
                    ? 'bg-success/20 text-success' 
                    : 'bg-warning/20 text-warning'
                }`}>
                  {listing.status}
                </span>
              </div>
              <p className="text-sm text-text-muted">{listing.city}</p>
              <p className="text-xs text-text-subtle mt-1">
                {listing.daysOnMarket} days on market
              </p>
            </div>
            
            <div className="text-right">
              <div className="flex items-center gap-1 text-lg font-bold text-text-heading mb-1">
                <DollarSign className="h-4 w-4" />
                {listing.price.toLocaleString()}
              </div>
              <div className="text-sm text-accent-gold font-medium">
                Commission: ${listing.commission.toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </BentoCard>
  );
}