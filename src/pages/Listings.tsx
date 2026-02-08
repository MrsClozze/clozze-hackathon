import { useState } from "react";
import { Plus, ChevronDown, Info } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { useListings } from "@/contexts/ListingsContext";
import { useAccountState } from "@/contexts/AccountStateContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import AddListingModal from "@/components/dashboard/AddListingModal";
import ListingDetailsModal from "@/components/dashboard/ListingDetailsModal";
import TransactionPromptModal from "@/components/transactions/TransactionPromptModal";
import { classifyImportIntent, type ImportSource } from "@/lib/importIntent";

export default function Listings() {
  const { listings, loading, openListingModal, selectedListing, isListingDetailsModalOpen, closeListingModal, updateListing } = useListings();
  const { isDemo } = useAccountState();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isActiveOpen, setIsActiveOpen] = useState(true);
  const [isPendingOpen, setIsPendingOpen] = useState(true);
  const [isClosedOpen, setIsClosedOpen] = useState(false);
  const [txnPrompt, setTxnPrompt] = useState<{ open: boolean; recordId: string; recordLabel: string; importSource: ImportSource } | null>(null);

  const handleListingCreated = (recordId: string, recordLabel: string, importSource: ImportSource) => {
    const intent = classifyImportIntent(importSource);
    if (intent === "high") {
      setTxnPrompt({ open: true, recordId, recordLabel, importSource });
    }
  };

  // Organize listings by status and sort by newest first (by listingStartDate)
  const sortByNewest = (a: typeof listings[0], b: typeof listings[0]) => 
    new Date(b.listingStartDate).getTime() - new Date(a.listingStartDate).getTime();
  
  const activeListings = listings.filter(l => l.status === 'Active').sort(sortByNewest);
  const pendingListings = listings.filter(l => l.status === 'Pending').sort(sortByNewest);
  const closedListings = listings.filter(l => l.status === 'Closed').sort(sortByNewest);
  
  // Limit to 3 items for display
  const displayActiveListings = activeListings.slice(0, 3);
  const displayPendingListings = pendingListings.slice(0, 3);
  const displayClosedListings = closedListings.slice(0, 3);
  
  // Track if we need "View All" buttons
  const [showAllActive, setShowAllActive] = useState(false);
  const [showAllPending, setShowAllPending] = useState(false);
  const [showAllClosed, setShowAllClosed] = useState(false);

  const renderListingCard = (listing: typeof listings[0]) => (
    <Card
      key={listing.id}
      onClick={() => openListingModal(listing)}
      className="cursor-pointer hover:border-accent-gold/30 transition-all duration-200 overflow-hidden group"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={listing.image}
          alt={listing.address}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-3 right-3">
          <Badge className={
            listing.status === 'Active' 
              ? 'bg-success text-white' 
              : listing.status === 'Pending'
              ? 'bg-warning text-white'
              : 'bg-secondary text-white'
          }>
            {listing.status.toUpperCase()}
          </Badge>
        </div>
        {/* Only show SAMPLE badge for demo listings */}
        {listing.isDemo && (
          <div className="absolute top-3 left-3">
            <Badge className="bg-accent-gold text-accent-gold-foreground">
              SAMPLE
            </Badge>
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold text-text-heading mb-1 group-hover:text-accent-gold transition-colors">
          {listing.address}
        </h3>
        <p className="text-sm text-text-muted mb-2">{listing.city}</p>
        <p className="text-2xl font-bold text-accent-gold">
          ${listing.price.toLocaleString()}
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-sm text-text-muted">
          <div>
            <p className="font-medium">{listing.bedrooms}</p>
            <p className="text-xs">Beds</p>
          </div>
          <div>
            <p className="font-medium">{listing.bathrooms}</p>
            <p className="text-xs">Baths</p>
          </div>
          <div>
            <p className="font-medium">{listing.sqFeet.toLocaleString()}</p>
            <p className="text-xs">Sq Ft</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-card-border">
          <p className="text-xs text-text-muted">Days on Market</p>
          <p className="font-semibold">{listing.daysOnMarket} days</p>
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
              <h1 className="text-3xl font-bold text-text-heading mb-2">Listings</h1>
              <p className="text-text-muted">Manage all your property listings and transactions.</p>
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
              <h1 className="text-3xl font-bold text-text-heading">Listings</h1>
              {isDemo && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-accent-gold/10 border border-accent-gold/30 text-accent-gold text-xs font-medium">
                  <Info className="h-3 w-3" />
                  Demo Mode
                </span>
              )}
            </div>
            <p className="text-text-muted">Manage all your property listings and transactions.</p>
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 relative bg-primary text-primary-foreground hover:bg-primary-hover px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 overflow-hidden group before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-r before:from-violet-500/20 before:via-fuchsia-500/20 before:to-cyan-500/20 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300 hover:backdrop-blur-md hover:border hover:border-white/20 hover:shadow-lg"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-400/30 via-pink-400/30 to-cyan-400/30 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-500 skew-x-12"></div>
            <Plus className="h-4 w-4 relative z-10" />
            <span className="relative z-10">{isDemo ? 'Add Your First Listing' : 'Add Listing'}</span>
          </button>
        </div>

        {/* Demo mode hint */}
        {isDemo && (
          <div className="mb-6 p-4 rounded-lg border border-accent-gold/30 bg-accent-gold/5">
            <p className="text-sm text-text-muted">
              <strong className="text-accent-gold">Demo Mode:</strong> You're viewing sample data. Add your first real listing to switch to live mode!
            </p>
          </div>
        )}

        <div className="space-y-6">
          {/* Active Listings Section */}
          <Collapsible open={isActiveOpen} onOpenChange={setIsActiveOpen}>
            <div className="border border-card-border rounded-lg bg-card">
              <CollapsibleTrigger className="w-full flex items-center justify-between p-4 hover:bg-card-elevated transition-colors">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold text-text-heading">Active</h2>
                  <Badge className="bg-success text-white">{activeListings.length}</Badge>
                </div>
                <ChevronDown className={`h-5 w-5 transition-transform ${isActiveOpen ? 'transform rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(showAllActive ? activeListings : displayActiveListings).map(renderListingCard)}
                  </div>
                  {activeListings.length === 0 && (
                    <p className="text-center text-text-muted py-8">No active listings</p>
                  )}
                  {activeListings.length > 3 && (
                    <div className="mt-6 text-center">
                      <button
                        onClick={() => setShowAllActive(!showAllActive)}
                        className="text-primary hover:text-primary-hover font-medium text-sm"
                      >
                        {showAllActive ? 'Show Less' : `View All (${activeListings.length})`}
                      </button>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Pending Listings Section */}
          <Collapsible open={isPendingOpen} onOpenChange={setIsPendingOpen}>
            <div className="border border-card-border rounded-lg bg-card">
              <CollapsibleTrigger className="w-full flex items-center justify-between p-4 hover:bg-card-elevated transition-colors">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold text-text-heading">Pending</h2>
                  <Badge className="bg-warning text-white">{pendingListings.length}</Badge>
                </div>
                <ChevronDown className={`h-5 w-5 transition-transform ${isPendingOpen ? 'transform rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(showAllPending ? pendingListings : displayPendingListings).map(renderListingCard)}
                  </div>
                  {pendingListings.length === 0 && (
                    <p className="text-center text-text-muted py-8">No pending listings</p>
                  )}
                  {pendingListings.length > 3 && (
                    <div className="mt-6 text-center">
                      <button
                        onClick={() => setShowAllPending(!showAllPending)}
                        className="text-primary hover:text-primary-hover font-medium text-sm"
                      >
                        {showAllPending ? 'Show Less' : `View All (${pendingListings.length})`}
                      </button>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Closed Listings Section */}
          <Collapsible open={isClosedOpen} onOpenChange={setIsClosedOpen}>
            <div className="border border-card-border rounded-lg bg-card">
              <CollapsibleTrigger className="w-full flex items-center justify-between p-4 hover:bg-card-elevated transition-colors">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold text-text-heading">Closed</h2>
                  <Badge className="bg-secondary text-white">{closedListings.length}</Badge>
                </div>
                <ChevronDown className={`h-5 w-5 transition-transform ${isClosedOpen ? 'transform rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(showAllClosed ? closedListings : displayClosedListings).map(renderListingCard)}
                  </div>
                  {closedListings.length === 0 && (
                    <p className="text-center text-text-muted py-8">No closed listings</p>
                  )}
                  {closedListings.length > 3 && (
                    <div className="mt-6 text-center">
                      <button
                        onClick={() => setShowAllClosed(!showAllClosed)}
                        className="text-primary hover:text-primary-hover font-medium text-sm"
                      >
                        {showAllClosed ? 'Show Less' : `View All (${closedListings.length})`}
                      </button>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        </div>

        <AddListingModal open={isAddModalOpen} onOpenChange={setIsAddModalOpen} onCreated={handleListingCreated} />
        <ListingDetailsModal
          open={isListingDetailsModalOpen}
          onOpenChange={closeListingModal}
          listing={selectedListing}
          onListingUpdate={updateListing}
        />
        {txnPrompt && (
          <TransactionPromptModal
            open={txnPrompt.open}
            onOpenChange={(open) => !open && setTxnPrompt(null)}
            recordType="listing"
            recordId={txnPrompt.recordId}
            recordLabel={txnPrompt.recordLabel}
            importSource={txnPrompt.importSource}
          />
        )}
      </div>
    </Layout>
  );
}
