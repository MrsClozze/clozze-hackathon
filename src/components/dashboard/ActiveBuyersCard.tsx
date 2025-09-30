import { useState } from "react";
import { Plus } from "lucide-react";
import AddBuyerModal from "./AddBuyerModal";
import BuyerDetailsModal from "./BuyerDetailsModal";
import { useBuyers } from "@/contexts/BuyersContext";

export default function ActiveBuyersCard() {
  const { buyers, openBuyerModal, selectedBuyer, isBuyerDetailsModalOpen, closeBuyerModal, updateBuyer } = useBuyers();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Filter to show only top 3 Active or Pending buyers (no Closed)
  const dashboardBuyers = buyers
    .filter(buyer => buyer.status === 'Active' || buyer.status === 'Pending')
    .slice(0, 3);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-text-heading">Buyers</h2>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 relative bg-primary text-primary-foreground hover:bg-primary-hover px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 overflow-hidden group before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-r before:from-violet-500/20 before:via-fuchsia-500/20 before:to-cyan-500/20 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300 hover:backdrop-blur-md hover:border hover:border-white/20 hover:shadow-lg"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-400/30 via-pink-400/30 to-cyan-400/30 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-500 skew-x-12"></div>
          <Plus className="h-4 w-4 relative z-10" />
          <span className="relative z-10">Add Buyer</span>
        </button>
      </div>

      <AddBuyerModal open={isAddModalOpen} onOpenChange={setIsAddModalOpen} />
      <BuyerDetailsModal 
        open={isBuyerDetailsModalOpen} 
        onOpenChange={closeBuyerModal}
        buyer={selectedBuyer}
        onBuyerUpdate={updateBuyer}
      />
      
      <div className="space-y-4">
        {dashboardBuyers.map((buyer) => (
          <div
            key={buyer.id}
            onClick={() => openBuyerModal(buyer)}
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