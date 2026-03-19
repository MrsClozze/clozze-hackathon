// Completion tracking for listings and buyers — weighted scoring with priority ordering

export interface CompletionItem {
  key: string;
  label: string;
  complete: boolean;
  category: 'required' | 'recommended' | 'optional';
  priority: number; // lower = higher priority (workflow order)
  actionType?: 'generate_description' | 'generate_highlights' | 'generate_marketing' | 'run_research' | 'structure_needs' | 'add_field';
  actionLabel?: string;
}

export interface CompletionResult {
  percentage: number;
  items: CompletionItem[];
  completeCount: number;
  totalCount: number;
  nextStep: CompletionItem | null; // highest-priority incomplete item
  blockers: CompletionItem[]; // incomplete required items
  improvements: CompletionItem[]; // incomplete recommended/optional items
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
    // Required — blockers (priority 1-7, workflow order)
    { key: 'address', label: 'Property address', complete: !!(listing.address && listing.city), category: 'required', priority: 1 },
    { key: 'price', label: 'Listing price', complete: !!(listing.price && listing.price > 0), category: 'required', priority: 2 },
    { key: 'bedrooms', label: 'Bedrooms', complete: !!(listing.bedrooms && listing.bedrooms > 0), category: 'required', priority: 3 },
    { key: 'bathrooms', label: 'Bathrooms', complete: !!(listing.bathrooms && listing.bathrooms > 0), category: 'required', priority: 4 },
    { key: 'sqFeet', label: 'Square footage', complete: !!(listing.sqFeet && listing.sqFeet > 0), category: 'required', priority: 5 },
    { key: 'sellerName', label: 'Seller name', complete: !!(listing.sellerFirstName && listing.sellerLastName), category: 'required', priority: 6 },
    { key: 'sellerContact', label: 'Seller contact info', complete: !!(listing.sellerEmail || listing.sellerPhone), category: 'required', priority: 7 },
    // Recommended — quality improvements (priority 10-13)
    { key: 'description', label: 'Listing description', complete: !!(listing.description && listing.description.length > 20), category: 'recommended', priority: 10, actionType: 'generate_description', actionLabel: 'Generate' },
    { key: 'highlights', label: 'Property highlights', complete: !!(listing.highlights && listing.highlights.length > 0), category: 'recommended', priority: 11, actionType: 'generate_highlights', actionLabel: 'Generate' },
    { key: 'zipcode', label: 'Zipcode', complete: !!(listing.zipcode), category: 'recommended', priority: 12 },
    { key: 'commission', label: 'Commission', complete: !!(listing.commissionPercentage && listing.commissionPercentage > 0), category: 'recommended', priority: 13 },
    // Optional — nice to have (priority 20+)
    { key: 'marketing', label: 'Marketing copy', complete: !!(listing.marketingCopy && Object.keys(listing.marketingCopy).length > 0), category: 'optional', priority: 20, actionType: 'generate_marketing', actionLabel: 'Generate' },
    { key: 'research', label: 'Research & notes', complete: !!(listing.internalNotes && listing.internalNotes.length > 0), category: 'optional', priority: 21, actionType: 'run_research', actionLabel: 'Run Research' },
    { key: 'dates', label: 'Listing dates', complete: !!(listing.listingStartDate), category: 'optional', priority: 22 },
  ];

  // Sort by priority for display
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
    // Required — blockers
    { key: 'name', label: 'Buyer name', complete: !!(buyer.firstName && buyer.lastName), category: 'required', priority: 1 },
    { key: 'email', label: 'Email address', complete: !!(buyer.email), category: 'required', priority: 2 },
    { key: 'phone', label: 'Phone number', complete: !!(buyer.phone), category: 'required', priority: 3 },
    { key: 'preApproval', label: 'Pre-approval amount', complete: !!(buyer.preApprovedAmount && buyer.preApprovedAmount > 0), category: 'required', priority: 4, actionType: 'add_field', actionLabel: 'Add' },
    // Recommended
    { key: 'wantsNeeds', label: 'Wants & needs', complete: hasStructuredNeeds, category: 'recommended', priority: 10, actionType: 'structure_needs', actionLabel: 'Structure' },
    { key: 'commission', label: 'Commission', complete: !!(buyer.commissionPercentage && buyer.commissionPercentage > 0), category: 'recommended', priority: 11 },
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

// Returns true if a buyer profile is complete enough to move into action phase
export function isBuyerActionReady(buyer: {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  wantsNeeds?: string;
  preApprovedAmount?: number;
}): boolean {
  return !!(
    buyer.firstName && buyer.lastName &&
    (buyer.email || buyer.phone) &&
    buyer.preApprovedAmount && buyer.preApprovedAmount > 0
  );
}

// Context-aware task bundles based on what's actually missing
export function getListingTaskBundle(completion: CompletionResult, listing: { address?: string }): { title: string; priority: string }[] {
  const tasks: { title: string; priority: string }[] = [];
  const missingKeys = new Set(completion.items.filter(i => !i.complete).map(i => i.key));

  // Always relevant prep tasks
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
  // Standard prep that's always useful
  tasks.push({ title: 'Schedule professional photography', priority: 'high' });
  tasks.push({ title: 'Prepare property disclosure documents', priority: 'medium' });

  return tasks;
}

export function getBuyerTaskBundle(completion: CompletionResult, buyer: { firstName?: string; lastName?: string }): { title: string; priority: string }[] {
  const tasks: { title: string; priority: string }[] = [];
  const missingKeys = new Set(completion.items.filter(i => !i.complete).map(i => i.key));

  if (missingKeys.has('preApproval')) {
    tasks.push({ title: 'Confirm pre-approval letter', priority: 'high' });
  }
  if (missingKeys.has('wantsNeeds')) {
    tasks.push({ title: 'Discuss and document buyer requirements', priority: 'high' });
  }
  if (missingKeys.has('phone') || missingKeys.has('email')) {
    tasks.push({ title: 'Collect missing contact information', priority: 'high' });
  }
  // Action-phase tasks (when profile is mostly complete)
  if (!missingKeys.has('preApproval') && !missingKeys.has('wantsNeeds')) {
    tasks.push({ title: 'Schedule initial property showings', priority: 'high' });
    tasks.push({ title: 'Send curated listings matching criteria', priority: 'medium' });
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
