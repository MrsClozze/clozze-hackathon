import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Loader2, User, Home, Check, AlertCircle, ExternalLink, Search, Link } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useFollowUpBossConnection } from "@/hooks/useFollowUpBossConnection";

interface FollowUpBossImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importType: "buyer" | "listing" | "contact";
  onImport: (data: any) => void;
}

interface FubPerson {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  tags: string[];
  stage: string;
  address: string;
}

interface FubDeal {
  id: number;
  name: string;
  stage: string;
  price: number;
  address: string;
  city: string;
  state: string;
  zip: string;
  type: string;
}

export function FollowUpBossImportModal({
  open,
  onOpenChange,
  importType,
  onImport,
}: FollowUpBossImportModalProps) {
  const [loading, setLoading] = useState(true);
  const [people, setPeople] = useState<FubPerson[]>([]);
  const [deals, setDeals] = useState<FubDeal[]>([]);
  const [selectedItem, setSelectedItem] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();
  const { connect: connectFub, connecting: fubConnecting } = useFollowUpBossConnection();

  useEffect(() => {
    if (open) {
      fetchData();
    } else {
      setSearchQuery("");
      setSelectedItem(null);
    }
  }, [open]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setSelectedItem(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Please sign in to continue");
        setLoading(false);
        return;
      }

      const action = importType === "listing" ? "fetch_deals" : "fetch_people";

      const response = await supabase.functions.invoke("sync-fub", {
        body: { action },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.error) throw new Error(response.error.message);

      const { data } = response.data;

      if (importType === "listing") {
        setDeals(data.deals || []);
        // If no deals, fall back to showing people
        if ((!data.deals || data.deals.length === 0) && data.people) {
          setPeople(data.people);
        }
      } else {
        setPeople(data.people || []);
      }
    } catch (err) {
      console.error("Error fetching FUB data:", err);
      const message = err instanceof Error ? err.message : "Failed to fetch data";
      if (message.includes("not connected")) {
        setError("Follow Up Boss is not connected. Please connect it first in Integrations.");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImport = () => {
    if (importType === "listing" && selectedItem !== null) {
      const deal = deals.find((d) => d.id === selectedItem);
      if (deal) {
        onImport({
          address: deal.address || deal.name || "",
          city: deal.city || "",
          zipcode: deal.zip || "",
          listingPrice: deal.price ? String(deal.price) : "",
        });
        toast({
          title: "Deal imported",
          description: `Imported "${deal.name || deal.address}" from Follow Up Boss`,
        });
        onOpenChange(false);
      }
    } else if (selectedItem !== null) {
      const person = people.find((p) => p.id === selectedItem);
      if (person) {
        if (importType === "buyer") {
          onImport({
            buyerFirstName: person.firstName || "",
            buyerLastName: person.lastName || "",
            buyerEmail: person.email || "",
            buyerPhone: person.phone || "",
          });
        } else {
          // Contact import
          onImport({
            firstName: person.firstName || "",
            lastName: person.lastName || "",
            email: person.email || "",
            phone: person.phone || "",
          });
        }
        toast({
          title: "Contact imported",
          description: `Imported ${person.firstName} ${person.lastName} from Follow Up Boss`,
        });
        onOpenChange(false);
      }
    }
  };

  const handleGoToIntegrations = () => {
    onOpenChange(false);
    navigate("/integrations");
  };

  // Filter items based on search
  const filteredPeople = people.filter((p) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      p.firstName?.toLowerCase().includes(q) ||
      p.lastName?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.phone?.includes(q)
    );
  });

  const filteredDeals = deals.filter((d) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      d.name?.toLowerCase().includes(q) ||
      d.address?.toLowerCase().includes(q) ||
      d.city?.toLowerCase().includes(q)
    );
  });

  const showPeople = importType !== "listing" || deals.length === 0;
  const items = showPeople ? filteredPeople : filteredDeals;
  const hasItems = items.length > 0;
  const totalItems = showPeople ? people.length : deals.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import from Follow Up Boss</DialogTitle>
          <DialogDescription>
            {importType === "listing"
              ? "Select a deal to import as a listing"
              : importType === "buyer"
              ? "Select a contact to import as a buyer"
              : "Select a contact to import"}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">
                Loading from Follow Up Boss...
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-10 w-10 text-destructive mb-4" />
              <p className="text-sm text-destructive mb-4">{error}</p>
              {error.includes("not connected") && (
                <div className="flex gap-2">
                  <Button onClick={async () => { await connectFub(); }} disabled={fubConnecting} variant="default">
                    {fubConnecting ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Connecting...</>
                    ) : (
                      <><Link className="h-4 w-4 mr-2" />Connect Now</>
                    )}
                  </Button>
                  <Button onClick={handleGoToIntegrations} variant="outline">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Go to Integrations
                  </Button>
                </div>
              )}
            </div>
          ) : totalItems === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                {importType === "listing" ? (
                  <Home className="h-6 w-6 text-muted-foreground" />
                ) : (
                  <User className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                No {importType === "listing" ? "deals" : "contacts"} found in Follow Up Boss
              </p>
            </div>
          ) : (
            <>
              {totalItems > 5 && (
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              )}
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {showPeople
                    ? filteredPeople.map((person) => (
                        <button
                          key={person.id}
                          onClick={() => setSelectedItem(person.id)}
                          className={`w-full text-left p-3 rounded-lg border transition-all ${
                            selectedItem === person.id
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50 hover:bg-muted/50"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <div>
                                <p className="font-medium text-sm">
                                  {person.firstName} {person.lastName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {person.email || "No email"}
                                  {person.stage ? ` • ${person.stage}` : ""}
                                </p>
                                {person.tags.length > 0 && (
                                  <div className="flex gap-1 mt-1 flex-wrap">
                                    {person.tags.slice(0, 3).map((tag, i) => (
                                      <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            {selectedItem === person.id && (
                              <Check className="h-4 w-4 text-primary flex-shrink-0" />
                            )}
                          </div>
                        </button>
                      ))
                    : filteredDeals.map((deal) => (
                        <button
                          key={deal.id}
                          onClick={() => setSelectedItem(deal.id)}
                          className={`w-full text-left p-3 rounded-lg border transition-all ${
                            selectedItem === deal.id
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50 hover:bg-muted/50"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Home className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <div>
                                <p className="font-medium text-sm">{deal.name || deal.address}</p>
                                <p className="text-xs text-muted-foreground">
                                  {deal.stage}
                                  {deal.price ? ` • $${deal.price.toLocaleString()}` : ""}
                                  {deal.city ? ` • ${deal.city}` : ""}
                                </p>
                              </div>
                            </div>
                            {selectedItem === deal.id && (
                              <Check className="h-4 w-4 text-primary flex-shrink-0" />
                            )}
                          </div>
                        </button>
                      ))}
                  {!hasItems && searchQuery && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No results for "{searchQuery}"
                    </p>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </div>

        {!loading && !error && totalItems > 0 && (
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={selectedItem === null}
              className="flex-1"
            >
              Import Selected
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
