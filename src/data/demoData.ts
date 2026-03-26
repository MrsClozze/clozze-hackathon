/**
 * Demo Data for Demo Mode
 * 
 * This is a curated sample transaction that shows users how the app works.
 * This data is ONLY shown when account_state = 'demo'.
 * It is never stored in the database and never mixed with real user data.
 */

import property1 from "@/assets/property-1.jpg";
import clientSarah from "@/assets/client-sarah.jpg";

// A single curated demo listing
export const DEMO_LISTING = {
  id: "demo-listing-1",
  address: "123 Demo Street",
  city: "Beverly Hills, CA",
  price: 1250000,
  status: "Active" as const,
  daysOnMarket: 14,
  commission: 37500,
  image: property1,
  sellerFirstName: "Demo",
  sellerLastName: "Seller",
  sellerEmail: "demo.seller@example.com",
  sellerPhone: "(555) 123-4567",
  zipcode: "90210",
  county: "Los Angeles County",
  bedrooms: 4,
  bathrooms: 3,
  sqFeet: 2800,
  appraisalPrice: 1200000,
  multiUnit: "no",
  listingStartDate: "2024-01-15",
  listingEndDate: "2024-07-15",
  brokerageName: "Sample Brokerage",
  brokerageAddress: "123 Main Street, Los Angeles, CA 90001",
  agentName: "Demo Agent",
  agentEmail: "demo.agent@example.com",
  commissionPercentage: 6.0,
  totalCommission: 75000,
  agentCommission: 37500,
  brokerageCommission: 37500,
};

// A single curated demo buyer
export const DEMO_BUYER = {
  id: "demo-buyer-1",
  name: "Sarah Demo",
  firstName: "Sarah",
  lastName: "Demo",
  email: "sarah.demo@example.com",
  phone: "(555) 987-6543",
  description: "Interested in 3-bedroom homes in good school districts",
  status: "Active" as const,
  image: clientSarah,
  preApprovedAmount: 650000,
  wantsNeeds: "Looking for a 3-bedroom house in a good school district, preferably with a large backyard and modern kitchen. Needs to be move-in ready.",
  brokerageName: "Sample Brokerage",
  brokerageAddress: "123 Main Street, Los Angeles, CA 90001",
  agentName: "Demo Agent",
  agentEmail: "demo.agent@example.com",
  commissionPercentage: 3.0,
  totalCommission: 19500,
  agentCommission: 9750,
  brokerageCommission: 9750,
};

// Demo tasks associated with the demo listing and buyer
export const DEMO_TASKS = [
  {
    id: "demo-task-1",
    title: "Schedule Property Viewing",
    date: "Scheduled",
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days from now
    address: DEMO_LISTING.address,
    assignee: DEMO_BUYER.name,
    hasAIAssist: true,
    priority: "high" as const,
    notes: "Demo task - shows how tasks connect to listings and buyers",
    status: "pending" as const,
    buyerId: DEMO_BUYER.id,
    listingId: DEMO_LISTING.id,
  },
  {
    id: "demo-task-2",
    title: "Prepare Listing Agreement",
    date: "In Progress",
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
    address: DEMO_LISTING.address,
    assignee: "Demo Agent",
    hasAIAssist: false,
    priority: "medium" as const,
    notes: "Demo task - shows document preparation workflow",
    status: "in-progress" as const,
    listingId: DEMO_LISTING.id,
  },
];

// Demo calendar events
export const DEMO_CALENDAR_EVENTS = [
  {
    id: "demo-event-1",
    title: "Property Showing",
    description: `Showing ${DEMO_LISTING.address} to ${DEMO_BUYER.name}`,
    event_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    event_time: "14:00",
    address: DEMO_LISTING.address,
    client: DEMO_BUYER.name,
    event_type: "showing",
    source: "demo",
  },
];

// Helper to check if an ID is a demo ID
export const isDemoId = (id: string): boolean => {
  return id.startsWith('demo-');
};
