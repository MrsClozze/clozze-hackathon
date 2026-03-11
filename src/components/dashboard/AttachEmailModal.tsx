import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBuyers } from "@/contexts/BuyersContext";
import { useListings } from "@/contexts/ListingsContext";
import { Home, User, Check } from "lucide-react";

interface AttachEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAttach: (target: { buyerId?: string; listingId?: string }) => void;
  emailSubject?: string;
}

export default function AttachEmailModal({ open, onOpenChange, onAttach, emailSubject }: AttachEmailModalProps) {
  const { buyers } = useBuyers();
  const { listings } = useListings();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<"buyer" | "listing">("buyer");
  const [tab, setTab] = useState("buyer");

  const handleConfirm = () => {
    if (!selectedId) return;
    if (selectedType === "buyer") {
      onAttach({ buyerId: selectedId });
    } else {
      onAttach({ listingId: selectedId });
    }
    setSelectedId(null);
    onOpenChange(false);
  };

  const handleTabChange = (value: string) => {
    setTab(value);
    setSelectedType(value as "buyer" | "listing");
    setSelectedId(null);
  };

  const realBuyers = buyers.filter(b => !b.isDemo);
  const realListings = listings.filter(l => !l.isDemo);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Link Email to Profile</DialogTitle>
        </DialogHeader>

        {emailSubject && (
          <p className="text-xs text-muted-foreground border-l-2 border-primary/40 pl-3 mb-2 line-clamp-2">
            "{emailSubject}"
          </p>
        )}

        <Tabs value={tab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="buyer" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Buyers ({realBuyers.length})
            </TabsTrigger>
            <TabsTrigger value="listing" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Listings ({realListings.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="buyer" className="max-h-[300px] overflow-y-auto space-y-2 mt-3">
            {realBuyers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No buyers yet</p>
            ) : (
              realBuyers.map((buyer) => (
                <button
                  key={buyer.id}
                  onClick={() => { setSelectedId(buyer.id); setSelectedType("buyer"); }}
                  className={`w-full text-left p-3 rounded-lg border transition-all flex items-center justify-between ${
                    selectedId === buyer.id
                      ? "border-primary bg-primary/10"
                      : "border-border bg-secondary hover:border-primary/30"
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-text-heading">{buyer.name}</p>
                    <p className="text-xs text-muted-foreground">{buyer.email}</p>
                  </div>
                  {selectedId === buyer.id && (
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  )}
                </button>
              ))
            )}
          </TabsContent>

          <TabsContent value="listing" className="max-h-[300px] overflow-y-auto space-y-2 mt-3">
            {realListings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No listings yet</p>
            ) : (
              realListings.map((listing) => (
                <button
                  key={listing.id}
                  onClick={() => { setSelectedId(listing.id); setSelectedType("listing"); }}
                  className={`w-full text-left p-3 rounded-lg border transition-all flex items-center justify-between ${
                    selectedId === listing.id
                      ? "border-primary bg-primary/10"
                      : "border-border bg-secondary hover:border-primary/30"
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-text-heading">{listing.address}</p>
                    <p className="text-xs text-muted-foreground">{listing.city} • ${listing.price.toLocaleString()}</p>
                  </div>
                  {selectedId === listing.id && (
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  )}
                </button>
              ))
            )}
          </TabsContent>
        </Tabs>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedId} className="flex-1">
            Attach Email
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
