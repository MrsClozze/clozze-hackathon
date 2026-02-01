import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { useAccountState } from "./AccountStateContext";
import { DEMO_LISTING, isDemoId } from "@/data/demoData";
import { useToast } from "@/hooks/use-toast";
import { trackQualifyLead, trackCloseConvertLead } from "@/lib/analytics";
import property1 from "@/assets/property-1.jpg";

export interface ListingData {
  id: string;
  address: string;
  city: string;
  price: number;
  status: string;
  daysOnMarket: number;
  commission: number;
  image: string;
  sellerFirstName: string;
  sellerLastName: string;
  sellerEmail: string;
  sellerPhone: string;
  zipcode: string;
  county: string;
  bedrooms: number;
  bathrooms: number;
  sqFeet: number;
  appraisalPrice: number;
  multiUnit: string;
  listingStartDate: string;
  listingEndDate: string;
  brokerageName: string;
  brokerageAddress: string;
  agentName: string;
  agentEmail: string;
  commissionPercentage: number;
  totalCommission: number;
  agentCommission: number;
  brokerageCommission: number;
  isDemo?: boolean;
}

interface ListingsContextType {
  listings: ListingData[];
  loading: boolean;
  updateListing: (updatedListing: ListingData) => Promise<void>;
  deleteListing: (id: string) => Promise<void>;
  addListing: (listing: Omit<ListingData, 'id' | 'isDemo'>) => Promise<void>;
  selectedListing: ListingData | null;
  isListingDetailsModalOpen: boolean;
  openListingModal: (listing: ListingData) => void;
  closeListingModal: () => void;
  refetchListings: () => Promise<void>;
}

const ListingsContext = createContext<ListingsContextType | undefined>(undefined);

export function ListingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { isDemo, activateAccount } = useAccountState();
  const { toast } = useToast();
  const [listings, setListings] = useState<ListingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState<ListingData | null>(null);
  const [isListingDetailsModalOpen, setIsListingDetailsModalOpen] = useState(false);

  const fetchListings = useCallback(async () => {
    // In demo mode, show the demo listing
    if (isDemo) {
      setListings([{ ...DEMO_LISTING, isDemo: true }]);
      setLoading(false);
      return;
    }

    // In live mode, fetch real data from database
    if (!user) {
      setListings([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedListings: ListingData[] = (data || []).map((listing) => ({
        id: listing.id,
        address: listing.address,
        city: listing.city,
        price: listing.price,
        status: listing.status,
        daysOnMarket: listing.days_on_market || 0,
        commission: listing.agent_commission || 0,
        image: property1, // Default image for now
        sellerFirstName: listing.seller_first_name || '',
        sellerLastName: listing.seller_last_name || '',
        sellerEmail: listing.seller_email || '',
        sellerPhone: listing.seller_phone || '',
        zipcode: listing.zipcode || '',
        county: listing.county || '',
        bedrooms: listing.bedrooms || 0,
        bathrooms: listing.bathrooms || 0,
        sqFeet: listing.sq_feet || 0,
        appraisalPrice: 0,
        multiUnit: 'no',
        listingStartDate: listing.listing_start_date || '',
        listingEndDate: listing.listing_end_date || '',
        brokerageName: '',
        brokerageAddress: '',
        agentName: '',
        agentEmail: '',
        commissionPercentage: listing.commission_percentage || 0,
        totalCommission: (listing.agent_commission || 0) * 2,
        agentCommission: listing.agent_commission || 0,
        brokerageCommission: listing.agent_commission || 0,
        isDemo: false,
      }));

      setListings(mappedListings);
    } catch (error) {
      console.error('Error fetching listings:', error);
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [user, isDemo]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const addListing = async (listing: Omit<ListingData, 'id' | 'isDemo'>) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to add a listing.",
        variant: "destructive",
      });
      return;
    }

    try {
      const newListing = {
        user_id: user.id,
        address: listing.address,
        city: listing.city,
        price: listing.price,
        status: listing.status || 'Active',
        days_on_market: listing.daysOnMarket || 0,
        bedrooms: listing.bedrooms,
        bathrooms: listing.bathrooms,
        sq_feet: listing.sqFeet,
        zipcode: listing.zipcode,
        county: listing.county,
        seller_first_name: listing.sellerFirstName,
        seller_last_name: listing.sellerLastName,
        seller_email: listing.sellerEmail,
        seller_phone: listing.sellerPhone,
        listing_start_date: listing.listingStartDate || null,
        listing_end_date: listing.listingEndDate || null,
        commission_percentage: listing.commissionPercentage,
        agent_commission: listing.agentCommission,
      };

      const { data, error } = await supabase
        .from('listings')
        .insert(newListing)
        .select()
        .single();

      if (error) throw error;

      // Activate account on first real listing
      await activateAccount();

      // Refetch to get the new listing
      await fetchListings();

      toast({
        title: "Success",
        description: "Listing created successfully.",
      });
    } catch (error: any) {
      console.error('Error adding listing:', error);
      toast({
        title: "Error",
        description: "Failed to create listing. Please try again.",
        variant: "destructive",
      });
    }
  };

  const updateListing = async (updatedListing: ListingData) => {
    // Demo listings are read-only in the sense that changes don't persist
    if (isDemoId(updatedListing.id)) {
      setListings((prev) =>
        prev.map((l) => (l.id === updatedListing.id ? updatedListing : l))
      );
      if (selectedListing?.id === updatedListing.id) {
        setSelectedListing(updatedListing);
      }
      toast({
        title: "Demo Mode",
        description: "Changes to demo data won't be saved. Add your first listing to go live!",
      });
      return;
    }

    // Get the current listing to track status changes
    const currentListing = listings.find(l => l.id === updatedListing.id);
    const oldStatus = currentListing?.status;
    const newStatus = updatedListing.status;

    try {
      const { error } = await supabase
        .from('listings')
        .update({
          address: updatedListing.address,
          city: updatedListing.city,
          price: updatedListing.price,
          status: updatedListing.status,
          days_on_market: updatedListing.daysOnMarket,
          bedrooms: updatedListing.bedrooms,
          bathrooms: updatedListing.bathrooms,
          sq_feet: updatedListing.sqFeet,
          zipcode: updatedListing.zipcode,
          county: updatedListing.county,
          seller_first_name: updatedListing.sellerFirstName,
          seller_last_name: updatedListing.sellerLastName,
          seller_email: updatedListing.sellerEmail,
          seller_phone: updatedListing.sellerPhone,
          listing_start_date: updatedListing.listingStartDate || null,
          listing_end_date: updatedListing.listingEndDate || null,
          commission_percentage: updatedListing.commissionPercentage,
          agent_commission: updatedListing.agentCommission,
        })
        .eq('id', updatedListing.id);

      if (error) throw error;

      // Track GA4 events for status changes
      if (oldStatus !== newStatus) {
        if (newStatus === 'Active' && oldStatus !== 'Active') {
          trackQualifyLead();
        } else if (newStatus === 'Closed' && oldStatus !== 'Closed') {
          trackCloseConvertLead();
        }
      }

      setListings((prev) =>
        prev.map((l) => (l.id === updatedListing.id ? { ...updatedListing, isDemo: false } : l))
      );
      if (selectedListing?.id === updatedListing.id) {
        setSelectedListing({ ...updatedListing, isDemo: false });
      }

      toast({
        title: "Success",
        description: "Listing updated successfully.",
      });
    } catch (error: any) {
      console.error('Error updating listing:', error);
      toast({
        title: "Error",
        description: "Failed to update listing. Please try again.",
        variant: "destructive",
      });
    }
  };

  const deleteListing = async (id: string) => {
    if (isDemoId(id)) {
      toast({
        title: "Demo Mode",
        description: "Demo listings cannot be deleted. Add your first listing to go live!",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setListings((prev) => prev.filter((l) => l.id !== id));
      if (selectedListing?.id === id) {
        setSelectedListing(null);
        setIsListingDetailsModalOpen(false);
      }

      toast({
        title: "Success",
        description: "Listing deleted successfully.",
      });
    } catch (error: any) {
      console.error('Error deleting listing:', error);
      toast({
        title: "Error",
        description: "Failed to delete listing. Please try again.",
        variant: "destructive",
      });
    }
  };

  const openListingModal = (listing: ListingData) => {
    setSelectedListing(listing);
    setIsListingDetailsModalOpen(true);
  };

  const closeListingModal = () => {
    setIsListingDetailsModalOpen(false);
  };

  return (
    <ListingsContext.Provider
      value={{
        listings,
        loading,
        updateListing,
        deleteListing,
        addListing,
        selectedListing,
        isListingDetailsModalOpen,
        openListingModal,
        closeListingModal,
        refetchListings: fetchListings,
      }}
    >
      {children}
    </ListingsContext.Provider>
  );
}

export function useListings() {
  const context = useContext(ListingsContext);
  if (context === undefined) {
    throw new Error("useListings must be used within a ListingsProvider");
  }
  return context;
}
