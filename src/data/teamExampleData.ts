// Example team data for MVP demonstration - matches Home Dashboard data
export const exampleTeamStats = {
  totalListings: 3,
  activeListings: 2,
  pendingListings: 1,
  closedListings: 1,
  totalBuyers: 3,
  activeBuyers: 3,
  totalSalesVolume: 10090000,
  totalCommission: 302700,
  avgCommission: 100900,
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
    agent: "John Smith",
  },
  {
    id: 3,
    address: "789 Pine Lane",
    city: "Santa Monica, CA",
    price: 1890000,
    status: "Closed",
    agent: "John Smith",
  },
];

export const exampleBuyers = [
  {
    id: 1,
    name: "Sarah Johnson",
    email: "sarah.johnson@email.com",
    status: "Active",
    agent: "John Smith",
    budget: 650000,
  },
  {
    id: 2,
    name: "Michael Brown",
    email: "michael.brown@email.com",
    status: "Active",
    agent: "John Smith",
    budget: 450000,
  },
  {
    id: 3,
    name: "Emily Davis",
    email: "emily.davis@email.com",
    status: "Active",
    agent: "John Smith",
    budget: 825000,
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
    details: "Sarah Johnson - $650K budget",
    agent: "John Smith",
    timestamp: "5 hours ago",
  },
  {
    id: 3,
    type: "listing",
    message: "Listing Status Updated to Pending",
    details: "456 Oak Avenue - $5.75M",
    agent: "John Smith",
    timestamp: "Yesterday",
  },
  {
    id: 4,
    type: "closing",
    message: "Deal Closed Successfully",
    details: "789 Pine Lane - $1.89M",
    agent: "John Smith",
    timestamp: "2 days ago",
  },
];

export const exampleUpcomingClosings = [
  {
    id: 1,
    address: "456 Oak Avenue",
    city: "Malibu, CA",
    closingDate: "2024-03-22",
    price: 5750000,
    agent: "John Smith",
  },
];

export const exampleDealPipeline = {
  inProspect: 3,
  underContract: 1,
  closedWon: 1,
  lostDeals: 0,
  forecastedRevenue: 8200000,
};