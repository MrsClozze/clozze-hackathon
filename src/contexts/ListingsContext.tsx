import { createContext, useContext, useState, ReactNode } from "react";
import property1 from "@/assets/property-1.jpg";
import property2 from "@/assets/property-2.jpg";
import property3 from "@/assets/property-3.jpg";

export interface ListingData {
  id: number;
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
}

interface ListingsContextType {
  listings: ListingData[];
  updateListing: (updatedListing: ListingData) => void;
  deleteListing: (id: number) => void;
  addListing: (listing: ListingData) => void;
  selectedListing: ListingData | null;
  isListingDetailsModalOpen: boolean;
  openListingModal: (listing: ListingData) => void;
  closeListingModal: () => void;
}

const ListingsContext = createContext<ListingsContextType | undefined>(undefined);

const initialListings: ListingData[] = [
  {
    id: 1,
    address: "123 Elm Street",
    city: "Beverly Hills, CA",
    price: 2450000,
    status: "Active",
    daysOnMarket: 14,
    commission: 73500,
    image: property1,
    sellerFirstName: "Robert",
    sellerLastName: "Martinez",
    sellerEmail: "robert.martinez@email.com",
    sellerPhone: "(555) 111-2222",
    zipcode: "90210",
    county: "Los Angeles County",
    bedrooms: 4,
    bathrooms: 3.5,
    sqFeet: 3200,
    appraisalPrice: 2400000,
    multiUnit: "no",
    listingStartDate: "2024-01-15",
    listingEndDate: "2024-07-15",
    brokerageName: "Clozze Real Estate",
    brokerageAddress: "123 Main Street, Los Angeles, CA 90001",
    agentName: "John Smith",
    agentEmail: "john.smith@clozze.com",
    commissionPercentage: 6.0,
    totalCommission: 147000,
    agentCommission: 73500,
    brokerageCommission: 73500,
  },
  {
    id: 2,
    address: "456 Oak Avenue",
    city: "Malibu, CA",
    price: 5750000,
    status: "Pending",
    daysOnMarket: 7,
    commission: 172500,
    image: property2,
    sellerFirstName: "Jennifer",
    sellerLastName: "Thompson",
    sellerEmail: "jennifer.thompson@email.com",
    sellerPhone: "(555) 222-3333",
    zipcode: "90265",
    county: "Los Angeles County",
    bedrooms: 5,
    bathrooms: 4.5,
    sqFeet: 4800,
    appraisalPrice: 5800000,
    multiUnit: "no",
    listingStartDate: "2024-01-20",
    listingEndDate: "2024-07-20",
    brokerageName: "Clozze Real Estate",
    brokerageAddress: "123 Main Street, Los Angeles, CA 90001",
    agentName: "John Smith",
    agentEmail: "john.smith@clozze.com",
    commissionPercentage: 6.0,
    totalCommission: 345000,
    agentCommission: 172500,
    brokerageCommission: 172500,
  },
  {
    id: 3,
    address: "789 Pine Lane",
    city: "Santa Monica, CA",
    price: 1890000,
    status: "Closed",
    daysOnMarket: 21,
    commission: 56700,
    image: property3,
    sellerFirstName: "David",
    sellerLastName: "Anderson",
    sellerEmail: "david.anderson@email.com",
    sellerPhone: "(555) 333-4444",
    zipcode: "90401",
    county: "Los Angeles County",
    bedrooms: 3,
    bathrooms: 2.5,
    sqFeet: 2400,
    appraisalPrice: 1850000,
    multiUnit: "no",
    listingStartDate: "2024-01-05",
    listingEndDate: "2024-07-05",
    brokerageName: "Clozze Real Estate",
    brokerageAddress: "123 Main Street, Los Angeles, CA 90001",
    agentName: "John Smith",
    agentEmail: "john.smith@clozze.com",
    commissionPercentage: 6.0,
    totalCommission: 113400,
    agentCommission: 56700,
    brokerageCommission: 56700,
  },
];

export function ListingsProvider({ children }: { children: ReactNode }) {
  const [listings, setListings] = useState<ListingData[]>(initialListings);
  const [selectedListing, setSelectedListing] = useState<ListingData | null>(null);
  const [isListingDetailsModalOpen, setIsListingDetailsModalOpen] = useState(false);

  const updateListing = (updatedListing: ListingData) => {
    setListings((prev) =>
      prev.map((listing) => (listing.id === updatedListing.id ? updatedListing : listing))
    );
    if (selectedListing?.id === updatedListing.id) {
      setSelectedListing(updatedListing);
    }
  };

  const deleteListing = (id: number) => {
    setListings((prev) => prev.filter((listing) => listing.id !== id));
    if (selectedListing?.id === id) {
      setSelectedListing(null);
      setIsListingDetailsModalOpen(false);
    }
  };

  const addListing = (listing: ListingData) => {
    setListings((prev) => [...prev, listing]);
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
        updateListing,
        deleteListing,
        addListing,
        selectedListing,
        isListingDetailsModalOpen,
        openListingModal,
        closeListingModal,
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
