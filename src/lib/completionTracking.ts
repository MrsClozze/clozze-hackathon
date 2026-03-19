// Completion tracking for listings and buyers

export interface CompletionItem {
  key: string;
  label: string;
  complete: boolean;
  category: 'required' | 'recommended' | 'optional';
  actionType?: 'generate_description' | 'generate_highlights' | 'generate_marketing' | 'run_research' | 'structure_needs' | 'add_field';
  actionLabel?: string;
}

export interface CompletionResult {
  percentage: number;
  items: CompletionItem[];
  completeCount: number;
  totalCount: number;
}

export function computeListingCompletion(listing: {
  description?: string;
  highlights?: string[];
  sellerFirstName?: string;
  sellerLastName?: string;
  sellerEmail?: string;
  sellerPhone?: string;
  address?: string;
  city?: string;
  zipcode?: string;
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  sqFeet?: number;
  marketingCopy?: Record<string, string>;
  internalNotes?: any[];
  listingStartDate?: string;
  commissionPercentage?: number;
}): CompletionResult {
  const items: CompletionItem[] = [
    { key: 'address', label: 'Property address', complete: !!(listing.address && listing.city), category: 'required' },
    { key: 'price', label: 'Listing price', complete: !!(listing.price && listing.price > 0), category: 'required' },
    { key: 'bedrooms', label: 'Bedrooms', complete: !!(listing.bedrooms && listing.bedrooms > 0), category: 'required' },
    { key: 'bathrooms', label: 'Bathrooms', complete: !!(listing.bathrooms && listing.bathrooms > 0), category: 'required' },
    { key: 'sqFeet', label: 'Square footage', complete: !!(listing.sqFeet && listing.sqFeet > 0), category: 'required' },
    { key: 'sellerName', label: 'Seller name', complete: !!(listing.sellerFirstName && listing.sellerLastName), category: 'required' },
    { key: 'sellerContact', label: 'Seller contact info', complete: !!(listing.sellerEmail || listing.sellerPhone), category: 'required' },
    { key: 'description', label: 'Listing description', complete: !!(listing.description && listing.description.length > 20), category: 'recommended', actionType: 'generate_description', actionLabel: 'Generate' },
    { key: 'highlights', label: 'Property highlights', complete: !!(listing.highlights && listing.highlights.length > 0), category: 'recommended', actionType: 'generate_highlights', actionLabel: 'Generate' },
    { key: 'marketing', label: 'Marketing copy', complete: !!(listing.marketingCopy && Object.keys(listing.marketingCopy).length > 0), category: 'optional', actionType: 'generate_marketing', actionLabel: 'Generate' },
    { key: 'research', label: 'Research & notes', complete: !!(listing.internalNotes && listing.internalNotes.length > 0), category: 'optional', actionType: 'run_research', actionLabel: 'Run Research' },
    { key: 'zipcode', label: 'Zipcode', complete: !!(listing.zipcode), category: 'recommended' },
    { key: 'commission', label: 'Commission', complete: !!(listing.commissionPercentage && listing.commissionPercentage > 0), category: 'recommended' },
    { key: 'dates', label: 'Listing dates', complete: !!(listing.listingStartDate), category: 'optional' },
  ];

  const completeCount = items.filter(i => i.complete).length;
  const totalCount = items.length;
  const percentage = Math.round((completeCount / totalCount) * 100);

  return { percentage, items, completeCount, totalCount };
}

export function computeBuyerCompletion(buyer: {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  wantsNeeds?: string;
  preApprovedAmount?: number;
  commissionPercentage?: number;
  status?: string;
}): CompletionResult {
  const hasStructuredNeeds = !!(buyer.wantsNeeds && buyer.wantsNeeds.length > 20);

  const items: CompletionItem[] = [
    { key: 'name', label: 'Buyer name', complete: !!(buyer.firstName && buyer.lastName), category: 'required' },
    { key: 'email', label: 'Email address', complete: !!(buyer.email), category: 'required' },
    { key: 'phone', label: 'Phone number', complete: !!(buyer.phone), category: 'required' },
    { key: 'preApproval', label: 'Pre-approval amount', complete: !!(buyer.preApprovedAmount && buyer.preApprovedAmount > 0), category: 'required', actionType: 'add_field', actionLabel: 'Add' },
    { key: 'wantsNeeds', label: 'Wants & needs', complete: hasStructuredNeeds, category: 'recommended', actionType: 'structure_needs', actionLabel: 'Structure' },
    { key: 'commission', label: 'Commission', complete: !!(buyer.commissionPercentage && buyer.commissionPercentage > 0), category: 'recommended' },
  ];

  const completeCount = items.filter(i => i.complete).length;
  const totalCount = items.length;
  const percentage = Math.round((completeCount / totalCount) * 100);

  return { percentage, items, completeCount, totalCount };
}

export const LISTING_PREP_TASKS = [
  { title: 'Schedule professional photography', priority: 'high' },
  { title: 'Complete MLS listing entry', priority: 'high' },
  { title: 'Order staging consultation', priority: 'medium' },
  { title: 'Review and finalize pricing', priority: 'high' },
  { title: 'Prepare property disclosure documents', priority: 'medium' },
  { title: 'Create and review marketing materials', priority: 'medium' },
];

export const BUYER_ONBOARDING_TASKS = [
  { title: 'Confirm pre-approval letter', priority: 'high' },
  { title: 'Schedule initial property showings', priority: 'high' },
  { title: 'Send curated listings matching criteria', priority: 'medium' },
  { title: 'Review offer preparation checklist', priority: 'medium' },
  { title: 'Discuss timeline and expectations', priority: 'medium' },
];
