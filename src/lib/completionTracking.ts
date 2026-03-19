// Completion tracking for listings and buyers — weighted scoring with priority ordering

export interface CompletionItem {
  key: string;
  label: string;
  complete: boolean;
  category: 'required' | 'recommended' | 'optional';
  priority: number; // lower = higher priority (workflow order)
  actionType?: 'generate_description' | 'generate_highlights' | 'generate_marketing' | 'run_research' | 'structure_needs' | 'add_field';
  actionLabel?: string;
  /** Hint shown in the Next Step card explaining how to resolve this gap */
  resolution?: string;
}

export interface CompletionResult {
  percentage: number;
  items: CompletionItem[];
  completeCount: number;
  totalCount: number;
  nextStep: CompletionItem | null;
  blockers: CompletionItem[];
  improvements: CompletionItem[];
}

const CATEGORY_WEIGHTS: Record<CompletionItem['category'], number> = {
  required: 3,
  recommended: 2,
  optional: 1,
};

function computeWeightedPercentage(items: CompletionItem[]): number {
  let totalWeight = 0;
  let completedWeight = 0;
  for (const item of items) {
    const w = CATEGORY_WEIGHTS[item.category];
    totalWeight += w;
    if (item.complete) completedWeight += w;
  }
  return totalWeight === 0 ? 100 : Math.round((completedWeight / totalWeight) * 100);
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
    // Required — blockers (priority 1-7)
    { key: 'address', label: 'Property address', complete: !!(listing.address && listing.city), category: 'required', priority: 1, resolution: 'Add the property address and city in the listing details.' },
    { key: 'price', label: 'Listing price', complete: !!(listing.price && listing.price > 0), category: 'required', priority: 2, resolution: 'Set the listing price in the property details.' },
    { key: 'bedrooms', label: 'Bedrooms', complete: !!(listing.bedrooms && listing.bedrooms > 0), category: 'required', priority: 3, resolution: 'Add bedroom count in the property details.' },
    { key: 'bathrooms', label: 'Bathrooms', complete: !!(listing.bathrooms && listing.bathrooms > 0), category: 'required', priority: 4, resolution: 'Add bathroom count in the property details.' },
    { key: 'sqFeet', label: 'Square footage', complete: !!(listing.sqFeet && listing.sqFeet > 0), category: 'required', priority: 5, resolution: 'Add the property square footage.' },
    { key: 'sellerName', label: 'Seller name', complete: !!(listing.sellerFirstName && listing.sellerLastName), category: 'required', priority: 6, resolution: 'Add the seller\'s first and last name.' },
    { key: 'sellerContact', label: 'Seller contact info', complete: !!(listing.sellerEmail || listing.sellerPhone), category: 'required', priority: 7, resolution: 'Add the seller\'s email or phone number.' },
    // Recommended (priority 10-13)
    { key: 'description', label: 'Listing description', complete: !!(listing.description && listing.description.length > 20), category: 'recommended', priority: 10, actionType: 'generate_description', actionLabel: 'Generate & Save', resolution: 'Generate an MLS-ready description from your property details.' },
    { key: 'highlights', label: 'Property highlights', complete: !!(listing.highlights && listing.highlights.length > 0), category: 'recommended', priority: 11, actionType: 'generate_highlights', actionLabel: 'Generate & Save', resolution: 'Generate key selling points from your listing data.' },
    { key: 'zipcode', label: 'Zipcode', complete: !!(listing.zipcode), category: 'recommended', priority: 12, resolution: 'Add the property zipcode.' },
    { key: 'commission', label: 'Commission', complete: !!(listing.commissionPercentage && listing.commissionPercentage > 0), category: 'recommended', priority: 13, resolution: 'Set the commission percentage.' },
    // Optional (priority 20+)
    { key: 'marketing', label: 'Marketing copy', complete: !!(listing.marketingCopy && Object.keys(listing.marketingCopy).length > 0), category: 'optional', priority: 20, actionType: 'generate_marketing', actionLabel: 'Generate & Save', resolution: 'Generate social media or email marketing copy.' },
    { key: 'research', label: 'Research & notes', complete: !!(listing.internalNotes && listing.internalNotes.length > 0), category: 'optional', priority: 21, actionType: 'run_research', actionLabel: 'Run Research', resolution: 'Run comps and neighborhood research for pricing support.' },
    { key: 'dates', label: 'Listing dates', complete: !!(listing.listingStartDate), category: 'optional', priority: 22, resolution: 'Set the listing start date.' },
  ];

  items.sort((a, b) => a.priority - b.priority);

  const completeCount = items.filter(i => i.complete).length;
  const totalCount = items.length;
  const percentage = computeWeightedPercentage(items);

  const incompleteItems = items.filter(i => !i.complete);
  const blockers = incompleteItems.filter(i => i.category === 'required');
  const improvements = incompleteItems.filter(i => i.category !== 'required');
  const nextStep = incompleteItems[0] || null;

  return { percentage, items, completeCount, totalCount, nextStep, blockers, improvements };
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
  const hasStructuredNeeds = !!(buyer.wantsNeeds && buyer.wantsNeeds.length > 10);

  const items: CompletionItem[] = [
    { key: 'name', label: 'Buyer name', complete: !!(buyer.firstName && buyer.lastName), category: 'required', priority: 1, resolution: 'Add the buyer\'s first and last name.' },
    { key: 'email', label: 'Email address', complete: !!(buyer.email), category: 'required', priority: 2, resolution: 'Add the buyer\'s email address.' },
    { key: 'phone', label: 'Phone number', complete: !!(buyer.phone), category: 'required', priority: 3, resolution: 'Add the buyer\'s phone number.' },
    { key: 'preApproval', label: 'Pre-approval amount', complete: !!(buyer.preApprovedAmount && buyer.preApprovedAmount > 0), category: 'required', priority: 4, actionType: 'add_field', actionLabel: 'Add', resolution: 'Confirm the buyer\'s pre-approval amount or budget.' },
    { key: 'wantsNeeds', label: 'Wants & needs', complete: hasStructuredNeeds, category: 'recommended', priority: 10, actionType: 'structure_needs', actionLabel: 'Structure', resolution: 'Structure the buyer\'s preferences into must-haves, nice-to-haves, and dealbreakers.' },
    { key: 'commission', label: 'Commission', complete: !!(buyer.commissionPercentage && buyer.commissionPercentage > 0), category: 'recommended', priority: 11, resolution: 'Set the buyer agent commission percentage.' },
  ];

  items.sort((a, b) => a.priority - b.priority);

  const completeCount = items.filter(i => i.complete).length;
  const totalCount = items.length;
  const percentage = computeWeightedPercentage(items);

  const incompleteItems = items.filter(i => !i.complete);
  const blockers = incompleteItems.filter(i => i.category === 'required');
  const improvements = incompleteItems.filter(i => i.category !== 'required');
  const nextStep = incompleteItems[0] || null;

  return { percentage, items, completeCount, totalCount, nextStep, blockers, improvements };
}

/** Returns the buyer's workflow phase based on profile completeness */
export type BuyerPhase = 'profiling' | 'search_ready' | 'showing' | 'offer_ready';

export function getBuyerPhase(buyer: {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  wantsNeeds?: string;
  preApprovedAmount?: number;
}): BuyerPhase {
  const hasContact = !!(buyer.email || buyer.phone);
  const hasPreApproval = !!(buyer.preApprovedAmount && buyer.preApprovedAmount > 0);
  const hasNeeds = !!(buyer.wantsNeeds && buyer.wantsNeeds.length > 10);

  if (!hasContact || !hasPreApproval) return 'profiling';
  if (!hasNeeds) return 'search_ready';
  return 'showing'; // has contact + budget + structured needs
}

// Context-aware task bundles based on what's actually missing
export function getListingTaskBundle(completion: CompletionResult, listing: { address?: string }): { title: string; priority: string }[] {
  const tasks: { title: string; priority: string }[] = [];
  const missingKeys = new Set(completion.items.filter(i => !i.complete).map(i => i.key));

  if (missingKeys.has('description') || missingKeys.has('highlights')) {
    tasks.push({ title: 'Complete MLS listing entry', priority: 'high' });
  }
  if (missingKeys.has('sellerName') || missingKeys.has('sellerContact')) {
    tasks.push({ title: 'Confirm seller contact information', priority: 'high' });
  }
  if (missingKeys.has('price')) {
    tasks.push({ title: 'Review and finalize pricing', priority: 'high' });
  }
  if (missingKeys.has('marketing')) {
    tasks.push({ title: 'Create and review marketing materials', priority: 'medium' });
  }
  if (missingKeys.has('research')) {
    tasks.push({ title: 'Run comps and neighborhood research', priority: 'medium' });
  }
  tasks.push({ title: 'Schedule professional photography', priority: 'high' });
  tasks.push({ title: 'Prepare property disclosure documents', priority: 'medium' });

  return tasks;
}

export function getBuyerTaskBundle(completion: CompletionResult, buyer: { firstName?: string; lastName?: string; wantsNeeds?: string; preApprovedAmount?: number; email?: string; phone?: string }): { title: string; priority: string }[] {
  const tasks: { title: string; priority: string }[] = [];
  const missingKeys = new Set(completion.items.filter(i => !i.complete).map(i => i.key));
  const phase = getBuyerPhase(buyer);

  if (missingKeys.has('preApproval')) {
    tasks.push({ title: 'Confirm pre-approval letter', priority: 'high' });
  }
  if (missingKeys.has('wantsNeeds')) {
    tasks.push({ title: 'Discuss and document buyer requirements', priority: 'high' });
  }
  if (missingKeys.has('phone') || missingKeys.has('email')) {
    tasks.push({ title: 'Collect missing contact information', priority: 'high' });
  }

  // Phase-aware action tasks
  if (phase === 'search_ready' || phase === 'showing') {
    tasks.push({ title: 'Send curated listings matching criteria', priority: 'high' });
    tasks.push({ title: 'Schedule initial property showings', priority: 'high' });
  }
  if (phase === 'showing') {
    tasks.push({ title: 'Prepare offer comparison worksheet', priority: 'medium' });
    tasks.push({ title: 'Review offer preparation checklist', priority: 'medium' });
  }
  tasks.push({ title: 'Discuss timeline and expectations', priority: 'medium' });

  return tasks;
}

// Legacy exports for backward compatibility
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
