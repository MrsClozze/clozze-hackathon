import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { useAccountState } from "./AccountStateContext";
import { DEMO_BUYER, isDemoId } from "@/data/demoData";
import { useToast } from "@/hooks/use-toast";
import { trackQualifyLead, trackCloseConvertLead } from "@/lib/analytics";
import buyerPlaceholder from "@/assets/buyer-placeholder.svg";

export interface BuyerData {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  description: string;
  status: string;
  image: string;
  preApprovedAmount: number;
  wantsNeeds: string;
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

interface BuyersContextType {
  buyers: BuyerData[];
  loading: boolean;
  updateBuyer: (updatedBuyer: BuyerData) => Promise<void>;
  deleteBuyer: (id: string) => Promise<void>;
  addBuyer: (buyer: Omit<BuyerData, 'id' | 'name' | 'isDemo'>) => Promise<void>;
  selectedBuyer: BuyerData | null;
  isBuyerDetailsModalOpen: boolean;
  openBuyerModal: (buyer: BuyerData) => void;
  closeBuyerModal: () => void;
  refetchBuyers: () => Promise<void>;
}

const BuyersContext = createContext<BuyersContextType | undefined>(undefined);

export function BuyersProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { isDemo, isLoading: accountStateLoading } = useAccountState();
  const { toast } = useToast();
  const [buyers, setBuyers] = useState<BuyerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBuyer, setSelectedBuyer] = useState<BuyerData | null>(null);
  const [isBuyerDetailsModalOpen, setIsBuyerDetailsModalOpen] = useState(false);

  // Get activateAccount separately to avoid dependency issues
  const { activateAccount } = useAccountState();

  const fetchBuyers = useCallback(async () => {
    // Wait for account state to be determined before fetching
    if (accountStateLoading) {
      return;
    }

    // In demo mode, show the demo buyer
    if (isDemo) {
      setBuyers([{ ...DEMO_BUYER, isDemo: true }]);
      setLoading(false);
      return;
    }

    // In live mode, fetch real data from database
    if (!user) {
      setBuyers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('buyers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedBuyers: BuyerData[] = (data || []).map((buyer) => {
        // Calculate commission values from stored data
        const preApprovedAmount = buyer.pre_approved_amount || 0;
        const commissionPercentage = buyer.commission_percentage || 0;
        const totalCommission = (preApprovedAmount * commissionPercentage) / 100;
        const agentCommission = totalCommission * 0.5;
        const brokerageCommission = totalCommission * 0.5;

        return {
          id: buyer.id,
          name: `${buyer.first_name} ${buyer.last_name}`,
          firstName: buyer.first_name,
          lastName: buyer.last_name,
          email: buyer.email,
          phone: buyer.phone || '',
          description: buyer.wants_needs ? buyer.wants_needs.slice(0, 50) + '...' : '',
          status: buyer.status,
          image: buyerPlaceholder, // Default placeholder until user uploads their own
          preApprovedAmount,
          wantsNeeds: buyer.wants_needs || '',
          brokerageName: '',
          brokerageAddress: '',
          agentName: '',
          agentEmail: '',
          commissionPercentage,
          totalCommission,
          agentCommission,
          brokerageCommission,
          isDemo: false,
        };
      });

      setBuyers(mappedBuyers);
    } catch (error) {
      console.error('Error fetching buyers:', error);
      setBuyers([]);
    } finally {
      setLoading(false);
    }
  }, [user, isDemo, accountStateLoading]);

  useEffect(() => {
    fetchBuyers();
  }, [fetchBuyers]);

  const addBuyer = async (buyer: Omit<BuyerData, 'id' | 'name' | 'isDemo'>) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to add a buyer.",
        variant: "destructive",
      });
      return;
    }

    try {
      const newBuyer = {
        user_id: user.id,
        first_name: buyer.firstName,
        last_name: buyer.lastName,
        email: buyer.email,
        phone: buyer.phone || null,
        status: buyer.status || 'Active',
        wants_needs: buyer.wantsNeeds,
        pre_approved_amount: buyer.preApprovedAmount || null,
        commission_percentage: buyer.commissionPercentage,
        agent_commission: buyer.agentCommission,
      };

      const { data, error } = await supabase
        .from('buyers')
        .insert(newBuyer)
        .select()
        .single();

      if (error) throw error;

      // Activate account on first real buyer
      await activateAccount();

      // Refetch to get the new buyer
      await fetchBuyers();

      toast({
        title: "Success",
        description: "Buyer created successfully.",
      });
    } catch (error: any) {
      console.error('Error adding buyer:', error);
      toast({
        title: "Error",
        description: "Failed to create buyer. Please try again.",
        variant: "destructive",
      });
    }
  };

  const updateBuyer = async (updatedBuyer: BuyerData) => {
    // Demo buyers are read-only
    if (isDemoId(updatedBuyer.id)) {
      setBuyers((prev) =>
        prev.map((b) => (b.id === updatedBuyer.id ? updatedBuyer : b))
      );
      if (selectedBuyer?.id === updatedBuyer.id) {
        setSelectedBuyer(updatedBuyer);
      }
      toast({
        title: "Demo Mode",
        description: "Changes to demo data won't be saved. Add your first buyer to go live!",
      });
      return;
    }

    // Get the current buyer to track status changes
    const currentBuyer = buyers.find(b => b.id === updatedBuyer.id);
    const oldStatus = currentBuyer?.status;
    const newStatus = updatedBuyer.status;

    try {
      const { error } = await supabase
        .from('buyers')
        .update({
          first_name: updatedBuyer.firstName,
          last_name: updatedBuyer.lastName,
          email: updatedBuyer.email,
          phone: updatedBuyer.phone || null,
          status: updatedBuyer.status,
          wants_needs: updatedBuyer.wantsNeeds,
          pre_approved_amount: updatedBuyer.preApprovedAmount || null,
          commission_percentage: updatedBuyer.commissionPercentage,
          agent_commission: updatedBuyer.agentCommission,
        })
        .eq('id', updatedBuyer.id);

      if (error) throw error;

      // Track GA4 events for status changes
      if (oldStatus !== newStatus) {
        if (newStatus === 'Active' && oldStatus !== 'Active') {
          trackQualifyLead();
        } else if (newStatus === 'Closed' && oldStatus !== 'Closed') {
          trackCloseConvertLead();
        }
      }

      setBuyers((prev) =>
        prev.map((b) => (b.id === updatedBuyer.id ? { ...updatedBuyer, isDemo: false } : b))
      );
      if (selectedBuyer?.id === updatedBuyer.id) {
        setSelectedBuyer({ ...updatedBuyer, isDemo: false });
      }

      toast({
        title: "Success",
        description: "Buyer updated successfully.",
      });
    } catch (error: any) {
      console.error('Error updating buyer:', error);
      toast({
        title: "Error",
        description: "Failed to update buyer. Please try again.",
        variant: "destructive",
      });
    }
  };

  const deleteBuyer = async (id: string) => {
    if (isDemoId(id)) {
      toast({
        title: "Demo Mode",
        description: "Demo buyers cannot be deleted. Add your first buyer to go live!",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('buyers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setBuyers((prev) => prev.filter((b) => b.id !== id));
      if (selectedBuyer?.id === id) {
        setSelectedBuyer(null);
        setIsBuyerDetailsModalOpen(false);
      }

      toast({
        title: "Success",
        description: "Buyer deleted successfully.",
      });
    } catch (error: any) {
      console.error('Error deleting buyer:', error);
      toast({
        title: "Error",
        description: "Failed to delete buyer. Please try again.",
        variant: "destructive",
      });
    }
  };

  const openBuyerModal = (buyer: BuyerData) => {
    setSelectedBuyer(buyer);
    setIsBuyerDetailsModalOpen(true);
  };

  const closeBuyerModal = () => {
    setIsBuyerDetailsModalOpen(false);
  };

  return (
    <BuyersContext.Provider
      value={{
        buyers,
        loading,
        updateBuyer,
        deleteBuyer,
        addBuyer,
        selectedBuyer,
        isBuyerDetailsModalOpen,
        openBuyerModal,
        closeBuyerModal,
        refetchBuyers: fetchBuyers,
      }}
    >
      {children}
    </BuyersContext.Provider>
  );
}

export function useBuyers() {
  const context = useContext(BuyersContext);
  if (context === undefined) {
    throw new Error("useBuyers must be used within a BuyersProvider");
  }
  return context;
}
