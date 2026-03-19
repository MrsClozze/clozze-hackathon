// Task type configuration for the AI assistant
export interface TaskTypeConfig {
  keywords: string[];
  label: string;
  suggestedActions: string[];
  icon: string;
}

export const TASK_TYPE_CONFIGS: Record<string, TaskTypeConfig> = {
  prepare_listing: {
    keywords: ['prepare listing', 'listing prep', 'list property', 'get listing ready'],
    label: 'Listing Preparation',
    suggestedActions: [
      'Summarize property',
      'Find comps',
      'Write listing description',
      'What am I missing?',
      'Research neighborhood',
      'Prepare MLS notes',
    ],
    icon: '🏠',
  },
  listing_description: {
    keywords: ['listing description', 'mls description', 'write description', 'create description'],
    label: 'Listing Description',
    suggestedActions: [
      'Write MLS description',
      'Highlight features',
      'Neighborhood highlights',
      'Alternate versions',
      'Check MLS compliance',
    ],
    icon: '✍️',
  },
  comps_pricing: {
    keywords: ['comp', 'comparable', 'pricing', 'price', 'cma', 'market analysis'],
    label: 'Comps & Pricing',
    suggestedActions: [
      'Find comps',
      'Suggest pricing',
      'Market trends',
      'Price comparison',
      'What data is missing?',
    ],
    icon: '📊',
  },
  listing_agreement: {
    keywords: ['listing agreement', 'prepare agreement', 'seller agreement'],
    label: 'Listing Agreement',
    suggestedActions: [
      'Summarize seller + property',
      'Draft email',
      'What info is missing?',
      'Create checklist',
    ],
    icon: '📋',
  },
  title_search: {
    keywords: ['title search', 'order title', 'title company', 'title work'],
    label: 'Title Search',
    suggestedActions: [
      'What is needed?',
      'Draft title request',
      'Create reminders',
      'Check missing info',
    ],
    icon: '🔍',
  },
  home_inspection: {
    keywords: ['inspection', 'home inspection', 'order inspection', 'inspector'],
    label: 'Home Inspection',
    suggestedActions: [
      'Find inspectors',
      'Draft inspection request',
      'What should I ask for?',
      'Create follow-up reminders',
    ],
    icon: '🔧',
  },
  buyer_task: {
    keywords: ['buyer', 'offer', 'purchase', 'showing', 'pre-approval'],
    label: 'Buyer Task',
    suggestedActions: [
      'Summarize buyer',
      'Next steps',
      'Draft offer notes',
      'Timeline check',
      'What is missing?',
    ],
    icon: '🤝',
  },
};

export function detectTaskType(title: string): string {
  const lowerTitle = title.toLowerCase();
  for (const [type, config] of Object.entries(TASK_TYPE_CONFIGS)) {
    if (config.keywords.some(kw => lowerTitle.includes(kw))) {
      return type;
    }
  }
  return 'general';
}

export function getTaskTypeConfig(title: string): TaskTypeConfig {
  const type = detectTaskType(title);
  return TASK_TYPE_CONFIGS[type] || {
    keywords: [],
    label: 'General Task',
    suggestedActions: ['How can I help?', 'Summarize context', 'What is missing?', 'Draft a message'],
    icon: '📌',
  };
}
