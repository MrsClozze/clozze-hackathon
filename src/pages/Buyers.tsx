import { useState } from "react";
import { Plus, Mail, Phone, DollarSign } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { useBuyers } from "@/contexts/BuyersContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AddBuyerModal from "@/components/dashboard/AddBuyerModal";
import BuyerDetailsModal from "@/components/dashboard/BuyerDetailsModal";

export default function Buyers() {
  const { buyers, openBuyerModal, selectedBuyer, isBuyerDetailsModalOpen, closeBuyerModal, updateBuyer } = useBuyers();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  return (
    <Layout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-text-heading mb-2">Buyers</h1>
            <p className="text-text-muted">Manage your buyer clients and their transactions.</p>
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 relative bg-primary text-primary-foreground hover:bg-primary-hover px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 overflow-hidden group before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-r before:from-violet-500/20 before:via-fuchsia-500/20 before:to-cyan-500/20 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300 hover:backdrop-blur-md hover:border hover:border-white/20 hover:shadow-lg"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-400/30 via-pink-400/30 to-cyan-400/30 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-500 skew-x-12"></div>
            <Plus className="h-4 w-4 relative z-10" />
            <span className="relative z-10">Add Buyer</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {buyers.map((buyer) => (
            <Card
              key={buyer.id}
              onClick={() => openBuyerModal(buyer)}
              className="cursor-pointer hover:border-accent-gold/30 transition-all duration-200 group"
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
                    <img
                      src={buyer.image}
                      alt={buyer.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-text-heading group-hover:text-accent-gold transition-colors mb-1">
                      {buyer.name}
                    </h3>
                    <Badge className="bg-accent-gold text-accent-gold-foreground mb-2">
                      EXAMPLE
                    </Badge>
                    <p className="text-sm text-text-muted line-clamp-2">
                      {buyer.description}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 mt-4 pt-4 border-t border-card-border">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-text-muted" />
                    <span className="text-text-muted truncate">{buyer.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-text-muted" />
                    <span className="text-text-muted">{buyer.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-text-muted" />
                    <div>
                      <p className="text-xs text-text-muted">Pre-approved Amount</p>
                      <p className="font-semibold text-accent-gold">
                        ${buyer.preApprovedAmount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-card-border">
                  <p className="text-xs text-text-muted mb-1">Wants & Needs</p>
                  <p className="text-sm text-text-muted line-clamp-2">{buyer.wantsNeeds}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <AddBuyerModal open={isAddModalOpen} onOpenChange={setIsAddModalOpen} />
        <BuyerDetailsModal
          open={isBuyerDetailsModalOpen}
          onOpenChange={closeBuyerModal}
          buyer={selectedBuyer}
          onBuyerUpdate={updateBuyer}
        />
      </div>
    </Layout>
  );
}