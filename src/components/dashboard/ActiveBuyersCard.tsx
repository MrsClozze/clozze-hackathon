import { useState } from "react";
import { Plus, Info } from "lucide-react";
import AddBuyerModal from "./AddBuyerModal";
import BuyerDetailsModal from "./BuyerDetailsModal";
import { useBuyers } from "@/contexts/BuyersContext";
import { useAccountState } from "@/contexts/AccountStateContext";
import { Skeleton } from "@/components/ui/skeleton";

export default function ActiveBuyersCard() {
  const { buyers, loading, openBuyerModal, selectedBuyer, isBuyerDetailsModalOpen, closeBuyerModal, updateBuyer } = useBuyers();
  const { isDemo } = useAccountState();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Filter to show only top 3 Active or Pending buyers (no Closed)
  const dashboardBuyers = buyers
    .filter(buyer => buyer.status === 'Active' || buyer.status === 'Pending')
    .slice(0, 3);

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-text-heading">Buyers</h2>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-text-heading">Buyers</h2>
          {isDemo && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-accent-gold/10 border border-accent-gold/30 text-accent-gold text-xs font-medium">
              <Info className="h-3 w-3" />
              Demo Mode
            </span>
          )}
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 relative bg-primary text-primary-foreground hover:bg-primary-hover px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 overflow-hidden group before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-r before:from-violet-500/20 before:via-fuchsia-500/20 before:to-cyan-500/20 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300 hover:backdrop-blur-md hover:border hover:border-white/20 hover:shadow-lg"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-400/30 via-pink-400/30 to-cyan-400/30 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-500 skew-x-12"></div>
          <Plus className="h-4 w-4 relative z-10" />
          <span className="relative z-10">{isDemo ? 'Add Your First Buyer' : 'Add Buyer'}</span>
        </button>
      </div>

      <AddBuyerModal open={isAddModalOpen} onOpenChange={setIsAddModalOpen} />
      <BuyerDetailsModal 
        open={isBuyerDetailsModalOpen} 
        onOpenChange={closeBuyerModal}
        buyer={selectedBuyer}
        onBuyerUpdate={updateBuyer}
      />
      
      {dashboardBuyers.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-lg">
          <p className="text-text-muted mb-4">No active buyers yet</p>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="text-primary hover:underline"
          >
            Add your first buyer
          </button>
        </div>
      ) : (
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

              {/* Demo Badge - only show for demo buyers */}
              {buyer.isDemo && (
                <div>
                  <span className="bg-accent-gold text-accent-gold-foreground px-2 py-1 rounded text-xs font-medium">
                    SAMPLE
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
