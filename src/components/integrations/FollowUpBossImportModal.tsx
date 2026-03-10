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
import { Label } from "@/components/ui/label";
import { Loader2, User, Home, Check, AlertCircle, Search, Key, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useFollowUpBossConnection } from "@/hooks/useFollowUpBossConnection";
import followUpBossLogo from "@/assets/follow-up-boss-logo.png";

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
  const [loading, setLoading] = useState(false);
  const [people, setPeople] = useState<FubPerson[]>([]);
  const [deals, setDeals] = useState<FubDeal[]>([]);
  const [selectedItem, setSelectedItem] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showApiKeyForm, setShowApiKeyForm] = useState(false);
  const { toast } = useToast();
  const {
    isConnected,
    connecting,
    connectWithApiKey,
    connectWithOAuth,
    refresh,
  } = useFollowUpBossConnection();

  useEffect(() => {
    if (open) {
      if (isConnected) {
        fetchData();
      }
      setSearchQuery("");
      setSelectedItem(null);
      setShowApiKeyForm(false);
      setApiKeyInput("");
    }
  }, [open, isConnected]);

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

      // Check for error in response data (edge function returned JSON error with non-2xx status)
      if (response.error) {
        // Try to extract the user-friendly message from the response data
        const errorBody = response.data;
        if (errorBody?.code === 'FUB_ACCOUNT_INACTIVE' || errorBody?.error?.includes('inactive') || errorBody?.error?.includes('plan level')) {
          throw new Error(errorBody.error);
        }
        // For other errors, try to use the response body message if available
        if (errorBody?.error) {
          throw new Error(errorBody.error);
        }
        throw new Error(response.error.message);
      }

      const { data } = response.data;

      if (importType === "listing") {
        setDeals(data.deals || []);
        if ((!data.deals || data.deals.length === 0) && data.people) {
          setPeople(data.people);
        }
      } else {
        setPeople(data.people || []);
      }
    } catch (err) {
      console.error("Error fetching FUB data:", err);
      const message = err instanceof Error ? err.message : "Failed to fetch data";
      setError(message);
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

  const handleConnectWithApiKey = async () => {
    const success = await connectWithApiKey(apiKeyInput);
    if (success) {
      setApiKeyInput("");
      setShowApiKeyForm(false);
      // refresh will trigger isConnected change → useEffect fetches data
    }
  };

  const handleConnectWithOAuth = async () => {
    await connectWithOAuth();
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

  // --- Connection view (not connected) ---
  if (!isConnected) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Connect Follow Up Boss</DialogTitle>
            <DialogDescription>
              Connect your Follow Up Boss account to import{" "}
              {importType === "listing" ? "deals" : "contacts"}.
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 space-y-5">
            <div className="flex justify-center">
              <img src={followUpBossLogo} alt="Follow Up Boss" className="h-12 object-contain" />
            </div>

            {!showApiKeyForm ? (
              <div className="space-y-3">
                <Button
                  onClick={handleConnectWithOAuth}
                  disabled={connecting}
                  className="w-full"
                >
                  {connecting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ExternalLink className="h-4 w-4 mr-2" />
                  )}
                  Sign in with Follow Up Boss
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">or</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={() => setShowApiKeyForm(true)}
                  className="w-full"
                >
                  <Key className="h-4 w-4 mr-2" />
                  Connect with API Key
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="fub-api-key">Follow Up Boss API Key</Label>
                  <Input
                    id="fub-api-key"
                    type="password"
                    placeholder="Paste your API key here"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Find your API key in Follow Up Boss → Admin → API
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowApiKeyForm(false);
                      setApiKeyInput("");
                    }}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleConnectWithApiKey}
                    disabled={connecting || !apiKeyInput.trim()}
                    className="flex-1"
                  >
                    {connecting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Connect
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // --- Import view (connected) ---
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
