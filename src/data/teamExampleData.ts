// Example team data for MVP demonstration
export const exampleTeamStats = {
  totalListings: 12,
  activeListings: 8,
  pendingListings: 3,
  closedListings: 1,
  totalBuyers: 15,
  activeBuyers: 12,
  totalSalesVolume: 8950000,
  totalCommission: 268500,
  avgCommission: 22375,
};

export const exampleListings = [
  {
    id: 1,
    address: "123 Elm Street",
    city: "Beverly Hills, CA",
    price: 2450000,
    status: "Active",
    agent: "John Smith",
  },
  {
    id: 2,
    address: "456 Oak Avenue",
    city: "Malibu, CA",
    price: 5750000,
    status: "Pending",
    agent: "Sarah Johnson",
  },
  {
    id: 3,
    address: "789 Pine Lane",
    city: "Santa Monica, CA",
    price: 1890000,
    status: "Active",
    agent: "Michael Chen",
  },
  {
    id: 4,
    address: "321 Maple Drive",
    city: "Pacific Palisades, CA",
    price: 3200000,
    status: "Active",
    agent: "Emily Davis",
  },
  {
    id: 5,
    address: "654 Cedar Court",
    city: "Brentwood, CA",
    price: 4100000,
    status: "Active",
    agent: "John Smith",
  },
];

export const exampleBuyers = [
  {
    id: 1,
    name: "Robert Martinez",
    email: "robert.m@email.com",
    status: "Active",
    agent: "John Smith",
    budget: 850000,
  },
  {
    id: 2,
    name: "Jennifer Thompson",
    email: "jennifer.t@email.com",
    status: "Active",
    agent: "Sarah Johnson",
    budget: 1200000,
  },
  {
    id: 3,
    name: "David Anderson",
    email: "david.a@email.com",
    status: "Active",
    agent: "Michael Chen",
    budget: 650000,
  },
  {
    id: 4,
    name: "Lisa Rodriguez",
    email: "lisa.r@email.com",
    status: "Active",
    agent: "Emily Davis",
    budget: 920000,
  },
  {
    id: 5,
    name: "James Wilson",
    email: "james.w@email.com",
    status: "Active",
    agent: "John Smith",
    budget: 1500000,
  },
];

export const exampleRecentActivity = [
  {
    id: 1,
    type: "listing",
    message: "New Listing Added",
    details: "123 Elm Street - $2.45M",
    agent: "John Smith",
    timestamp: "2 hours ago",
  },
  {
    id: 2,
    type: "buyer",
    message: "New Buyer Client Onboarded",
    details: "Robert Martinez - $850K budget",
    agent: "John Smith",
    timestamp: "5 hours ago",
  },
  {
    id: 3,
    type: "showing",
    message: "Property Showing Completed",
    details: "456 Oak Avenue with Jennifer Thompson",
    agent: "Sarah Johnson",
    timestamp: "Yesterday",
  },
  {
    id: 4,
    type: "offer",
    message: "Offer Submitted",
    details: "789 Pine Lane - $1.85M offer",
    agent: "Michael Chen",
    timestamp: "Yesterday",
  },
  {
    id: 5,
    type: "closing",
    message: "Deal Closing Scheduled",
    details: "321 Maple Drive - Closing on March 15",
    agent: "Emily Davis",
    timestamp: "2 days ago",
  },
];

export const exampleUpcomingClosings = [
  {
    id: 1,
    address: "321 Maple Drive",
    city: "Pacific Palisades, CA",
    closingDate: "2024-03-15",
    price: 3200000,
    agent: "Emily Davis",
  },
  {
    id: 2,
    address: "456 Oak Avenue",
    city: "Malibu, CA",
    closingDate: "2024-03-22",
    price: 5750000,
    agent: "Sarah Johnson",
  },
  {
    id: 3,
    address: "789 Pine Lane",
    city: "Santa Monica, CA",
    closingDate: "2024-03-28",
    price: 1890000,
    agent: "Michael Chen",
  },
];

export const exampleDealPipeline = {
  inProspect: 18,
  underContract: 5,
  closedWon: 8,
  lostDeals: 3,
  forecastedRevenue: 15200000,
};