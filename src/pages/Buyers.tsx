import { useState } from "react";
import { Plus, Mail, Phone, DollarSign, ChevronDown, Info } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { useBuyers } from "@/contexts/BuyersContext";
import { useAccountState } from "@/contexts/AccountStateContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import AddBuyerModal from "@/components/dashboard/AddBuyerModal";
import BuyerDetailsModal from "@/components/dashboard/BuyerDetailsModal";

export default function Buyers() {
  const { buyers, loading, openBuyerModal, selectedBuyer, isBuyerDetailsModalOpen, closeBuyerModal, updateBuyer } = useBuyers();
  const { isDemo } = useAccountState();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isActiveOpen, setIsActiveOpen] = useState(true);
  const [isPendingOpen, setIsPendingOpen] = useState(true);
  const [isClosedOpen, setIsClosedOpen] = useState(false);

  // Organize buyers by status
  const activeBuyers = buyers.filter(b => b.status === 'Active');
  const pendingBuyers = buyers.filter(b => b.status === 'Pending');
  const closedBuyers = buyers.filter(b => b.status === 'Closed');
  
  // Limit to 3 items for display
  const displayActiveBuyers = activeBuyers.slice(0, 3);
  const displayPendingBuyers = pendingBuyers.slice(0, 3);
  const displayClosedBuyers = closedBuyers.slice(0, 3);
  
  // Track if we need "View All" buttons
  const [showAllActive, setShowAllActive] = useState(false);
  const [showAllPending, setShowAllPending] = useState(false);
  const [showAllClosed, setShowAllClosed] = useState(false);

  const renderBuyerCard = (buyer: typeof buyers[0]) => (
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
            {/* Only show SAMPLE badge for demo buyers */}
            {buyer.isDemo && (
              <Badge className="bg-accent-gold text-accent-gold-foreground mb-2">
                SAMPLE
              </Badge>
            )}
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
  );

  if (loading) {
    return (
      <Layout>
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-text-heading mb-2">Buyers</h1>
              <p className="text-text-muted">Manage your buyer clients and their transactions.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-80 rounded-lg" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-text-heading">Buyers</h1>
              {isDemo && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-accent-gold/10 border border-accent-gold/30 text-accent-gold text-xs font-medium">
                  <Info className="h-3 w-3" />
                  Demo Mode
                </span>
              )}
            </div>
            <p className="text-text-muted">Manage your buyer clients and their transactions.</p>
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

        {/* Demo mode hint */}
        {isDemo && (
          <div className="mb-6 p-4 rounded-lg border border-accent-gold/30 bg-accent-gold/5">
            <p className="text-sm text-text-muted">
              <strong className="text-accent-gold">Demo Mode:</strong> You're viewing sample data. Add your first real buyer to switch to live mode!
            </p>
          </div>
        )}

        <div className="space-y-6">
          {/* Active Buyers Section */}
          <Collapsible open={isActiveOpen} onOpenChange={setIsActiveOpen}>
            <div className="border border-card-border rounded-lg bg-card">
              <CollapsibleTrigger className="w-full flex items-center justify-between p-4 hover:bg-card-elevated transition-colors">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold text-text-heading">Active</h2>
                  <Badge className="bg-success text-white">{activeBuyers.length}</Badge>
                </div>
                <ChevronDown className={`h-5 w-5 transition-transform ${isActiveOpen ? 'transform rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(showAllActive ? activeBuyers : displayActiveBuyers).map(renderBuyerCard)}
                  </div>
                  {activeBuyers.length === 0 && (
                    <p className="text-center text-text-muted py-8">No active buyers</p>
                  )}
                  {activeBuyers.length > 3 && (
                    <div className="mt-6 text-center">
                      <button
                        onClick={() => setShowAllActive(!showAllActive)}
                        className="text-primary hover:text-primary-hover font-medium text-sm"
                      >
                        {showAllActive ? 'Show Less' : `View All (${activeBuyers.length})`}
                      </button>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Pending Buyers Section */}
          <Collapsible open={isPendingOpen} onOpenChange={setIsPendingOpen}>
            <div className="border border-card-border rounded-lg bg-card">
              <CollapsibleTrigger className="w-full flex items-center justify-between p-4 hover:bg-card-elevated transition-colors">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold text-text-heading">Pending</h2>
                  <Badge className="bg-warning text-white">{pendingBuyers.length}</Badge>
                </div>
                <ChevronDown className={`h-5 w-5 transition-transform ${isPendingOpen ? 'transform rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(showAllPending ? pendingBuyers : displayPendingBuyers).map(renderBuyerCard)}
                  </div>
                  {pendingBuyers.length === 0 && (
                    <p className="text-center text-text-muted py-8">No pending buyers</p>
                  )}
                  {pendingBuyers.length > 3 && (
                    <div className="mt-6 text-center">
                      <button
                        onClick={() => setShowAllPending(!showAllPending)}
                        className="text-primary hover:text-primary-hover font-medium text-sm"
                      >
                        {showAllPending ? 'Show Less' : `View All (${pendingBuyers.length})`}
                      </button>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Closed Buyers Section */}
          <Collapsible open={isClosedOpen} onOpenChange={setIsClosedOpen}>
            <div className="border border-card-border rounded-lg bg-card">
              <CollapsibleTrigger className="w-full flex items-center justify-between p-4 hover:bg-card-elevated transition-colors">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold text-text-heading">Closed</h2>
                  <Badge className="bg-secondary text-white">{closedBuyers.length}</Badge>
                </div>
                <ChevronDown className={`h-5 w-5 transition-transform ${isClosedOpen ? 'transform rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(showAllClosed ? closedBuyers : displayClosedBuyers).map(renderBuyerCard)}
                  </div>
                  {closedBuyers.length === 0 && (
                    <p className="text-center text-text-muted py-8">No closed buyers</p>
                  )}
                  {closedBuyers.length > 3 && (
                    <div className="mt-6 text-center">
                      <button
                        onClick={() => setShowAllClosed(!showAllClosed)}
                        className="text-primary hover:text-primary-hover font-medium text-sm"
                      >
                        {showAllClosed ? 'Show Less' : `View All (${closedBuyers.length})`}
                      </button>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
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
