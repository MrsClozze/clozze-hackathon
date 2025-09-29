import { useState } from "react";
import { Plus, MapPin, DollarSign } from "lucide-react";
import BentoCard from "./BentoCard";
import { Button } from "@/components/ui/button";
import AddListingModal from "./AddListingModal";
import property1 from "@/assets/property-1.jpg";
import property2 from "@/assets/property-2.jpg";
import property3 from "@/assets/property-3.jpg";

const activeListings = [
  {
    id: 1,
    address: "123 Elm Street",
    city: "Beverly Hills, CA",
    price: 2450000,
    status: "Active",
    daysOnMarket: 14,
    commission: 73500,
    image: property1,
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
  },
];

export default function ActiveListingsCard() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-text-heading">Listings</h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 relative bg-primary text-primary-foreground hover:bg-primary-hover px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 overflow-hidden group before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-r before:from-violet-500/20 before:via-fuchsia-500/20 before:to-cyan-500/20 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300 hover:backdrop-blur-md hover:border hover:border-white/20 hover:shadow-lg"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-400/30 via-pink-400/30 to-cyan-400/30 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-500 skew-x-12"></div>
          <Plus className="h-4 w-4 relative z-10" />
          <span className="relative z-10">Add Listing</span>
        </button>
      </div>

      <AddListingModal open={isModalOpen} onOpenChange={setIsModalOpen} />
      
      <div className="grid grid-cols-3 gap-4">
        {activeListings.map((listing) => (
          <div
            key={listing.id}
            className="relative group cursor-pointer rounded-lg overflow-hidden bg-card border border-card-border hover:border-accent-gold/30 transition-all duration-200"
          >
            {/* Property Image */}
            <div className="relative aspect-[4/3] overflow-hidden">
              <img
                src={listing.image}
                alt={listing.address}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              
              {/* Status Badge */}
              <div className="absolute top-3 right-3">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  listing.status === 'Active' 
                    ? 'bg-success text-white' 
                    : listing.status === 'Pending'
                    ? 'bg-warning text-white'
                    : 'bg-secondary text-white'
                }`}>
                  {listing.status.toUpperCase()}
                </span>
              </div>

              {/* Example Badge */}
              <div className="absolute top-3 left-3">
                <span className="bg-accent-gold text-accent-gold-foreground px-2 py-1 rounded text-xs font-medium">
                  EXAMPLE
                </span>
              </div>
            </div>

            {/* Property Details */}
            <div className="p-4">
              <h3 className="font-semibold text-text-heading mb-1 group-hover:text-accent-gold transition-colors">
                {listing.address}
              </h3>
              <p className="text-sm text-text-muted mb-2">{listing.status}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}