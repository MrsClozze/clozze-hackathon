import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import AddBuyerModal from "./AddBuyerModal";
import BuyerDetailsModal from "./BuyerDetailsModal";
import clientSarah from "@/assets/client-sarah.jpg";
import clientMichael from "@/assets/client-michael.jpg";
import clientEmily from "@/assets/client-emily.jpg";

const activeBuyers = [
  {
    id: 1,
    name: "Sarah Johnson",
    firstName: "Sarah",
    lastName: "Johnson",
    email: "sarah.johnson@email.com",
    phone: "(555) 123-4567",
    description: "Interested in 3-bedroom houses",
    status: "Active",
    image: clientSarah,
    preApprovedAmount: 650000,
    wantsNeeds: "Looking for a 3-bedroom house in a good school district, preferably with a large backyard and modern kitchen. Needs to be move-in ready.",
    brokerageName: "Clozze Real Estate",
    brokerageAddress: "123 Main Street, Los Angeles, CA 90001",
    agentName: "John Smith",
    agentEmail: "john.smith@clozze.com",
    commissionPercentage: 3.0,
    totalCommission: 19500,
    agentCommission: 9750,
    brokerageCommission: 9750,
  },
  {
    id: 2,
    name: "Michael Brown",
    firstName: "Michael",
    lastName: "Brown",
    email: "michael.brown@email.com",
    phone: "(555) 234-5678",
    description: "Looking for a condo downtown",
    status: "Active",
    image: clientMichael,
    preApprovedAmount: 450000,
    wantsNeeds: "Seeking a modern condo in downtown area with parking, close to public transportation. Prefers high-floor units with city views.",
    brokerageName: "Clozze Real Estate",
    brokerageAddress: "123 Main Street, Los Angeles, CA 90001",
    agentName: "John Smith",
    agentEmail: "john.smith@clozze.com",
    commissionPercentage: 3.0,
    totalCommission: 13500,
    agentCommission: 6750,
    brokerageCommission: 6750,
  },
  {
    id: 3,
    name: "Emily Davis",
    firstName: "Emily",
    lastName: "Davis",
    email: "emily.davis@email.com",
    phone: "(555) 345-6789",
    description: "Searching for family home with a yard",
    status: "Active",
    image: clientEmily,
    preApprovedAmount: 825000,
    wantsNeeds: "Family home with at least 4 bedrooms, 3 bathrooms, large yard for kids and pets. Must have good schools nearby and safe neighborhood.",
    brokerageName: "Clozze Real Estate",
    brokerageAddress: "123 Main Street, Los Angeles, CA 90001",
    agentName: "John Smith",
    agentEmail: "john.smith@clozze.com",
    commissionPercentage: 3.0,
    totalCommission: 24750,
    agentCommission: 12375,
    brokerageCommission: 12375,
  },
];

export default function ActiveBuyersCard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedBuyer, setSelectedBuyer] = useState<typeof activeBuyers[0] | null>(null);

  const handleBuyerClick = (buyer: typeof activeBuyers[0]) => {
    setSelectedBuyer(buyer);
    setIsDetailsModalOpen(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-text-heading">Buyers</h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 relative bg-primary text-primary-foreground hover:bg-primary-hover px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 overflow-hidden group before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-r before:from-violet-500/20 before:via-fuchsia-500/20 before:to-cyan-500/20 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300 hover:backdrop-blur-md hover:border hover:border-white/20 hover:shadow-lg"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-400/30 via-pink-400/30 to-cyan-400/30 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-500 skew-x-12"></div>
          <Plus className="h-4 w-4 relative z-10" />
          <span className="relative z-10">Add Buyer</span>
        </button>
      </div>

      <AddBuyerModal open={isModalOpen} onOpenChange={setIsModalOpen} />
      <BuyerDetailsModal 
        open={isDetailsModalOpen} 
        onOpenChange={setIsDetailsModalOpen}
        buyer={selectedBuyer}
      />
      
      <div className="space-y-4">
        {activeBuyers.map((buyer) => (
          <div
            key={buyer.id}
            onClick={() => handleBuyerClick(buyer)}
            className="flex items-center gap-4 p-4 rounded-lg bg-card border border-card-border hover:border-accent-gold/30 transition-all duration-200 cursor-pointer group"
          >
            {/* Profile Photo */}
            <div className="w-12 h-12 rounded-full overflow-hidden">
              <img
                src={buyer.image}
                alt={buyer.name}
                className="w-12 h-12 rounded-full object-cover"
              />
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