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

export const exampleAgentPerformance = {
  topPerformers: 2,
  atRisk: 1,
  avgResponseTime: "2.1h",
  agents: [
    {
      id: 1,
      name: "John Smith",
      avatar: "/placeholder.svg",
      deals: 8,
      volume: 10090000,
      activeBuyers: 12,
      listings: 3,
      responseTime: "1.2h",
      followUps: { completed: 15, total: 15, overdue: 0 },
      showings: 24,
      status: "Top Performer" as const,
    },
    {
      id: 2,
      name: "Sarah Johnson",
      avatar: "/placeholder.svg",
      deals: 6,
      volume: 7200000,
      activeBuyers: 9,
      listings: 2,
      responseTime: "1.8h",
      followUps: { completed: 12, total: 12, overdue: 0 },
      showings: 18,
      status: "Top Performer" as const,
    },
    {
      id: 3,
      name: "Michael Chen",
      avatar: "/placeholder.svg",
      deals: 5,
      volume: 4850000,
      activeBuyers: 7,
      listings: 2,
      responseTime: "6.5h",
      followUps: { completed: 8, total: 12, overdue: 4 },
      showings: 12,
      status: "At Risk" as const,
    },
    {
      id: 4,
      name: "Emily Davis",
      avatar: "/placeholder.svg",
      deals: 4,
      volume: 3100000,
      activeBuyers: 8,
      listings: 1,
      responseTime: "3.1h",
      followUps: { completed: 9, total: 11, overdue: 2 },
      showings: 15,
      status: "Average" as const,
    },
  ],
};