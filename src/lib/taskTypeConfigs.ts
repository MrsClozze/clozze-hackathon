// Task type configuration for the AI assistant
export interface TaskTypeConfig {
  keywords: string[];
  label: string;
  suggestedActions: string[];
  icon: string;
  autoContextTemplate: string;
}

export const TASK_TYPE_CONFIGS: Record<string, TaskTypeConfig> = {
  prepare_listing: {
    keywords: ['prepare listing', 'listing prep', 'list property', 'get listing ready'],
    label: 'Listing Preparation',
    suggestedActions: [
      'Write listing description',
      'Find comparable sales',
      'Suggest pricing strategy',
      'What am I missing before listing?',
      'Research property + neighborhood',
      'Create preparation checklist',
    ],
    icon: '🏠',
    autoContextTemplate: `I see you're preparing a listing{{property}}. I can help you:\n\n• **Write a compelling MLS description** from the property details\n• **Research comparable sales** in the area\n• **Identify missing information** before going live\n• **Create a preparation checklist** with deadlines\n\nWhat would you like to start with?`,
  },
  listing_description: {
    keywords: ['listing description', 'mls description', 'write description', 'create description'],
    label: 'Listing Description',
    suggestedActions: [
      'Write MLS description',
      'Highlight key features',
      'Add neighborhood highlights',
      'Generate alternate versions',
      'Check MLS compliance',
    ],
    icon: '✍️',
    autoContextTemplate: `I see you need a listing description{{property}}. I can:\n\n• **Draft an MLS-ready description** highlighting key features\n• **Add neighborhood & lifestyle context**\n• **Generate multiple versions** (professional, lifestyle, luxury)\n• **Check for MLS compliance** issues\n\nShall I start drafting?`,
  },
  comps_pricing: {
    keywords: ['comp', 'comparable', 'pricing', 'price', 'cma', 'market analysis'],
    label: 'Comps & Pricing',
    suggestedActions: [
      'Find comparable sales',
      'Suggest listing price',
      'Analyze market trends',
      'Compare price per sqft',
      'What data am I missing?',
    ],
    icon: '📊',
    autoContextTemplate: `I see you're working on comps and pricing{{property}}. I can:\n\n• **Research comparable sales** in the area\n• **Suggest a pricing strategy** based on available data\n• **Analyze market trends** for positioning\n• **Identify missing data** that could strengthen your CMA\n\nWhat would you like me to research first?`,
  },
  listing_agreement: {
    keywords: ['listing agreement', 'prepare agreement', 'seller agreement'],
    label: 'Listing Agreement',
    suggestedActions: [
      'Summarize seller + property details',
      'Draft email to seller',
      'Identify missing information',
      'Create agreement checklist',
    ],
    icon: '📋',
    autoContextTemplate: `I see you're preparing a listing agreement{{seller}}. I can:\n\n• **Summarize seller & property details** for the agreement\n• **Identify missing information** needed to proceed\n• **Draft a professional email** to the seller\n• **Create a checklist** of required steps\n\nHow would you like to proceed?`,
  },
  title_search: {
    keywords: ['title search', 'order title', 'title company', 'title work'],
    label: 'Title Search',
    suggestedActions: [
      'What info is needed to order?',
      'Draft title company request',
      'Create follow-up reminders',
      'Check for missing documents',
    ],
    icon: '🔍',
    autoContextTemplate: `I see you need to handle a title search{{property}}. I can:\n\n• **Identify what's needed** before ordering\n• **Draft a request** to the title company\n• **Create follow-up reminders** for key milestones\n• **Check for missing documents** or info\n\nWhat would you like help with?`,
  },
  home_inspection: {
    keywords: ['inspection', 'home inspection', 'order inspection', 'inspector'],
    label: 'Home Inspection',
    suggestedActions: [
      'Find inspectors in the area',
      'Draft inspection request email',
      'What inspections should I order?',
      'Create follow-up reminders',
    ],
    icon: '🔧',
    autoContextTemplate: `I see you're handling a home inspection{{property}}. I can:\n\n• **Find qualified inspectors** in the area\n• **Recommend inspection types** to request\n• **Draft an outreach email** to inspectors\n• **Set up follow-up reminders** for results\n\nWhere should we start?`,
  },
  buyer_task: {
    keywords: ['buyer', 'offer', 'purchase', 'showing', 'pre-approval'],
    label: 'Buyer Task',
    suggestedActions: [
      'Structure buyer preferences',
      'Identify missing questions',
      'Create follow-up checklist',
      'Summarize for CRM',
      'Draft client confirmation',
    ],
    icon: '🤝',
    autoContextTemplate: `I see you're working with a buyer{{buyer}}. I can:\n\n• **Structure their preferences** into must-haves, nice-to-haves, and dealbreakers\n• **Identify missing questions** to ask\n• **Create a follow-up checklist** with next steps\n• **Draft a client confirmation** message\n\nWhat would be most helpful?`,
  },
};

export const GENERAL_CONFIG: TaskTypeConfig = {
  keywords: [],
  label: 'General Task',
  suggestedActions: [
    'Summarize this task',
    'Suggest next steps',
    'Create follow-up tasks',
    'Draft a related message',
  ],
  icon: '📌',
  autoContextTemplate: `I've reviewed this task{{details}}. I can:\n\n• **Summarize the context** and current status\n• **Suggest actionable next steps**\n• **Create follow-up tasks** with deadlines\n• **Draft related messages** or notes\n\nHow can I help you move this forward?`,
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
  return TASK_TYPE_CONFIGS[type] || GENERAL_CONFIG;
}

/**
 * Build an auto-context message based on task data.
 */
export function buildAutoContextMessage(task: {
  title: string;
  notes?: string;
  address?: string;
  buyerId?: string;
  listingId?: string;
}, context?: {
  buyerName?: string;
  listingAddress?: string;
  sellerName?: string;
}): string {
  const config = getTaskTypeConfig(task.title);
  let message = config.autoContextTemplate;

  // Fill in template placeholders
  const propertyInfo = context?.listingAddress || task.address;
  message = message.replace('{{property}}', propertyInfo ? ` for **${propertyInfo}**` : '');
  message = message.replace('{{buyer}}', context?.buyerName ? ` **${context.buyerName}**` : '');
  message = message.replace('{{seller}}', context?.sellerName ? ` for **${context.sellerName}**` : '');
  message = message.replace('{{details}}', task.notes ? ` and your notes` : '');

  return message;
}

/**
 * Parse action markers from AI response text.
 * Returns extracted actions like [ACTION:create_task], [ACTION:save_draft], etc.
 */
export interface ParsedAction {
  type: 'save_notes' | 'create_tasks' | 'save_draft' | 'copy_text';
  label: string;
  content: string;
}

export function parseResponseActions(content: string): ParsedAction[] {
  const actions: ParsedAction[] = [];

  // Check for content that looks like a checklist / task list
  const taskListPattern = /(?:^|\n)[\s]*[-•✓☐]\s+.+/gm;
  const taskMatches = content.match(taskListPattern);
  if (taskMatches && taskMatches.length >= 2) {
    actions.push({
      type: 'create_tasks',
      label: 'Create Tasks',
      content: taskMatches.map(m => m.trim().replace(/^[-•✓☐]\s+/, '')).join('\n'),
    });
  }

  // Check for content that looks like a description/draft (paragraphs)
  if (content.length > 200) {
    actions.push({
      type: 'save_draft',
      label: 'Save Draft',
      content,
    });
  }

  // Always offer save to notes if there's substantial content
  if (content.length > 100) {
    actions.push({
      type: 'save_notes',
      label: 'Save to Notes',
      content,
    });
  }

  return actions;
}
