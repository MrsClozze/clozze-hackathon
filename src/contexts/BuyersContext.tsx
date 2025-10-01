import { createContext, useContext, useState, ReactNode } from "react";
import clientSarah from "@/assets/client-sarah.jpg";
import clientMichael from "@/assets/client-michael.jpg";
import clientEmily from "@/assets/client-emily.jpg";

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
}

interface BuyersContextType {
  buyers: BuyerData[];
  updateBuyer: (updatedBuyer: BuyerData) => void;
  deleteBuyer: (id: string) => void;
  addBuyer: (buyer: BuyerData) => void;
  selectedBuyer: BuyerData | null;
  isBuyerDetailsModalOpen: boolean;
  openBuyerModal: (buyer: BuyerData) => void;
  closeBuyerModal: () => void;
}

const BuyersContext = createContext<BuyersContextType | undefined>(undefined);

const initialBuyers: BuyerData[] = [
  {
    id: "1",
    name: "Sarah Johnson",
    firstName: "Sarah",
    lastName: "Johnson",
    email: "sarah.johnson@email.com",
    phone: "(555) 123-4567",
    description: "Interested in 3-bedroom houses",
    status: "Active",
    image: clientSarah,
    preApprovedAmount: 650000,
    wantsNeeds: "Looking for a 3-bedroom house in a good school district, preferably with a large backyard and modern kitchen. Needs to be move-in ready.",
    brokerageName: "Clozze Real Estate",
    brokerageAddress: "123 Main Street, Los Angeles, CA 90001",
    agentName: "John Smith",
    agentEmail: "john.smith@clozze.com",
    commissionPercentage: 3.0,
    totalCommission: 19500,
    agentCommission: 9750,
    brokerageCommission: 9750,
  },
  {
    id: "2",
    name: "Michael Brown",
    firstName: "Michael",
    lastName: "Brown",
    email: "michael.brown@email.com",
    phone: "(555) 234-5678",
    description: "Looking for a condo downtown",
    status: "Active",
    image: clientMichael,
    preApprovedAmount: 450000,
    wantsNeeds: "Seeking a modern condo in downtown area with parking, close to public transportation. Prefers high-floor units with city views.",
    brokerageName: "Clozze Real Estate",
    brokerageAddress: "123 Main Street, Los Angeles, CA 90001",
    agentName: "John Smith",
    agentEmail: "john.smith@clozze.com",
    commissionPercentage: 3.0,
    totalCommission: 13500,
    agentCommission: 6750,
    brokerageCommission: 6750,
  },
  {
    id: "3",
    name: "Emily Davis",
    firstName: "Emily",
    lastName: "Davis",
    email: "emily.davis@email.com",
    phone: "(555) 345-6789",
    description: "Searching for family home with a yard",
    status: "Active",
    image: clientEmily,
    preApprovedAmount: 825000,
    wantsNeeds: "Family home with at least 4 bedrooms, 3 bathrooms, large yard for kids and pets. Must have good schools nearby and safe neighborhood.",
    brokerageName: "Clozze Real Estate",
    brokerageAddress: "123 Main Street, Los Angeles, CA 90001",
    agentName: "John Smith",
    agentEmail: "john.smith@clozze.com",
    commissionPercentage: 3.0,
    totalCommission: 24750,
    agentCommission: 12375,
    brokerageCommission: 12375,
  },
];

export function BuyersProvider({ children }: { children: ReactNode }) {
  const [buyers, setBuyers] = useState<BuyerData[]>(initialBuyers);
  const [selectedBuyer, setSelectedBuyer] = useState<BuyerData | null>(null);
  const [isBuyerDetailsModalOpen, setIsBuyerDetailsModalOpen] = useState(false);

  const updateBuyer = (updatedBuyer: BuyerData) => {
    setBuyers((prev) =>
      prev.map((buyer) => (buyer.id === updatedBuyer.id ? updatedBuyer : buyer))
    );
    if (selectedBuyer?.id === updatedBuyer.id) {
      setSelectedBuyer(updatedBuyer);
    }
  };

  const deleteBuyer = (id: string) => {
    setBuyers((prev) => prev.filter((buyer) => buyer.id !== id));
    if (selectedBuyer?.id === id) {
      setSelectedBuyer(null);
      setIsBuyerDetailsModalOpen(false);
    }
  };

  const addBuyer = (buyer: BuyerData) => {
    setBuyers((prev) => [...prev, buyer]);
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
        updateBuyer,
        deleteBuyer,
        addBuyer,
        selectedBuyer,
        isBuyerDetailsModalOpen,
        openBuyerModal,
        closeBuyerModal,
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
