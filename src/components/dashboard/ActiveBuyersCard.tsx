import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import clientSarah from "@/assets/client-sarah.jpg";
import clientMichael from "@/assets/client-michael.jpg";
import clientEmily from "@/assets/client-emily.jpg";

const activeBuyers = [
  {
    id: 1,
    name: "Sarah Johnson",
    description: "Interested in 3-bedroom houses",
    status: "Active",
    image: clientSarah,
  },
  {
    id: 2,
    name: "Michael Brown",
    description: "Looking for a condo downtown",
    status: "Active",
    image: clientMichael,
  },
  {
    id: 3,
    name: "Emily Davis",
    description: "Searching for family home with a yard",
    status: "Active",
    image: clientEmily,
  },
];

export default function ActiveBuyersCard() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-text-heading">Buyers</h2>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Buyer
        </Button>
      </div>
      
      <div className="space-y-4">
        {activeBuyers.map((buyer) => (
          <div
            key={buyer.id}
            className="flex items-center gap-4 p-4 rounded-lg bg-card border border-card-border hover:border-accent-gold/30 transition-all duration-200 cursor-pointer group"
          >
            {/* Profile Photo */}
            <div className="relative">
              <img
                src={buyer.image}
                alt={buyer.name}
                className="w-12 h-12 rounded-full object-cover"
              />
              
              {/* Example Badge */}
              <div className="absolute -top-1 -right-1">
                <span className="bg-accent-gold text-accent-gold-foreground px-1 py-0.5 rounded text-[10px] font-medium">
                  EXAMPLE
                </span>
              </div>
            </div>

            {/* Buyer Details */}
            <div className="flex-1">
              <h3 className="font-semibold text-text-heading group-hover:text-accent-gold transition-colors">
                {buyer.name}
              </h3>
              <p className="text-sm text-text-muted">{buyer.description}</p>
            </div>

            {/* Status Badge */}
            <div>
              <span className="bg-accent-gold text-accent-gold-foreground px-2 py-1 rounded text-xs font-medium">
                EXAMPLE
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}