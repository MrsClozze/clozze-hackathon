// Task type configuration for the Clozze AI assistant
export interface TaskTypeConfig {
  keywords: string[];
  label: string;
  suggestedActions: string[];
  icon: string;
  autoContextTemplate: (ctx: AutoContextData) => string;
}

export interface AutoContextData {
  taskTitle: string;
  taskStatus?: string;
  taskPriority?: string;
  taskNotes?: string;
  taskAddress?: string;
  buyerName?: string;
  buyerStatus?: string;
  buyerPreApproved?: number;
  buyerWantsNeeds?: string;
  listingAddress?: string;
  listingPrice?: number;
  listingBeds?: number;
  listingBaths?: number;
  listingSqFt?: number;
  listingStatus?: string;
  sellerName?: string;
  transactionState?: string;
  transactionCloseDate?: string;
}

function formatPrice(n?: number): string {
  if (!n) return '';
  return '$' + n.toLocaleString();
}

function propSummary(ctx: AutoContextData): string {
  const parts: string[] = [];
  if (ctx.listingAddress) parts.push(`**${ctx.listingAddress}**`);
  if (ctx.listingPrice) parts.push(formatPrice(ctx.listingPrice));
  if (ctx.listingBeds || ctx.listingBaths) {
    const specs = [ctx.listingBeds ? `${ctx.listingBeds}bd` : '', ctx.listingBaths ? `${ctx.listingBaths}ba` : ''].filter(Boolean).join('/');
    parts.push(specs);
  }
  if (ctx.listingSqFt) parts.push(`${ctx.listingSqFt.toLocaleString()} sqft`);
  return parts.length > 0 ? parts.join(' · ') : '';
}

function buyerSummary(ctx: AutoContextData): string {
  const parts: string[] = [];
  if (ctx.buyerName) parts.push(`**${ctx.buyerName}**`);
  if (ctx.buyerStatus) parts.push(`(${ctx.buyerStatus})`);
  if (ctx.buyerPreApproved) parts.push(`pre-approved at ${formatPrice(ctx.buyerPreApproved)}`);
  return parts.join(' ');
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
    autoContextTemplate: (ctx) => {
      const prop = propSummary(ctx);
      const seller = ctx.sellerName ? ` for seller **${ctx.sellerName}**` : '';
      const status = ctx.listingStatus ? ` (currently ${ctx.listingStatus})` : '';
      return `I've analyzed your listing preparation task${seller}.\n\n${prop ? `**Property:** ${prop}${status}\n\n` : ''}I can help you:\n- **Write a compelling MLS description** from the property details\n- **Research comparable sales** in the area\n- **Identify what's missing** before going live\n- **Create a preparation checklist** with deadlines\n\nWhat would you like to start with?`;
    },
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
    autoContextTemplate: (ctx) => {
      const prop = propSummary(ctx);
      return `I'm ready to write a listing description.\n\n${prop ? `**Property:** ${prop}\n\n` : ''}I can:\n- **Draft an MLS-ready description** highlighting key selling points\n- **Add neighborhood & lifestyle context** with live research\n- **Generate multiple versions** (professional, lifestyle, luxury)\n- **Check for MLS compliance** issues\n\nShall I start drafting?`;
    },
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
    autoContextTemplate: (ctx) => {
      const prop = propSummary(ctx);
      return `I'm ready to help with comps and pricing analysis.\n\n${prop ? `**Property:** ${prop}\n\n` : ''}I can:\n- **Research recent comparable sales** nearby\n- **Suggest a pricing strategy** based on market data\n- **Analyze price-per-sqft trends** in the area\n- **Flag missing data** that could strengthen your CMA\n\nWhat would you like me to research first?`;
    },
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
    autoContextTemplate: (ctx) => {
      const seller = ctx.sellerName ? ` with seller **${ctx.sellerName}**` : '';
      const prop = propSummary(ctx);
      return `I see you're preparing a listing agreement${seller}.\n\n${prop ? `**Property:** ${prop}\n\n` : ''}I can:\n- **Summarize seller & property details** for the agreement\n- **Identify missing information** needed to proceed\n- **Draft a professional email** to the seller\n- **Create a step-by-step checklist** for the process\n\nHow would you like to proceed?`;
    },
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
    autoContextTemplate: (ctx) => {
      const prop = propSummary(ctx);
      const close = ctx.transactionCloseDate ? `\n**Target Close:** ${ctx.transactionCloseDate}` : '';
      return `I see you need to handle a title search.\n\n${prop ? `**Property:** ${prop}${close}\n\n` : ''}I can:\n- **List what's needed** before ordering the title search\n- **Draft a request** to the title company\n- **Create follow-up reminders** for key milestones\n- **Check for missing documents** or information\n\nWhat would you like help with?`;
    },
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
    autoContextTemplate: (ctx) => {
      const prop = propSummary(ctx);
      return `I see you're handling a home inspection.\n\n${prop ? `**Property:** ${prop}\n\n` : ''}I can:\n- **Find qualified inspectors** near this property\n- **Recommend inspection types** to request\n- **Draft an outreach email** to inspectors\n- **Set up follow-up reminders** for results\n\nWhere should we start?`;
    },
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
    autoContextTemplate: (ctx) => {
      const buyer = buyerSummary(ctx);
      const needs = ctx.buyerWantsNeeds ? `\n**Current Wants/Needs:** ${ctx.buyerWantsNeeds.substring(0, 150)}${ctx.buyerWantsNeeds.length > 150 ? '…' : ''}` : '';
      return `I'm ready to help with this buyer task.\n\n${buyer ? `**Buyer:** ${buyer}${needs}\n\n` : ''}I can:\n- **Structure their preferences** into must-haves, nice-to-haves, and dealbreakers\n- **Identify missing questions** you should ask\n- **Create a follow-up checklist** with next steps\n- **Draft a confirmation message** for the client\n\nWhat would be most helpful?`;
    },
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
  autoContextTemplate: (ctx) => {
    const parts: string[] = [];
    if (ctx.taskPriority === 'high') parts.push('This is a **high-priority** task.');
    if (ctx.taskNotes) parts.push(`I see you have notes attached.`);
    if (ctx.buyerName) parts.push(`Linked to buyer **${ctx.buyerName}**.`);
    if (ctx.listingAddress) parts.push(`Linked to property **${ctx.listingAddress}**.`);
    const detail = parts.length > 0 ? parts.join(' ') + '\n\n' : '';
    return `I've reviewed your task: **${ctx.taskTitle}**\n\n${detail}I can:\n- **Summarize the context** and current status\n- **Suggest actionable next steps**\n- **Create follow-up tasks** with deadlines\n- **Draft related messages** or notes\n\nHow can I help you move this forward?`;
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
  return TASK_TYPE_CONFIGS[type] || GENERAL_CONFIG;
}

/**
 * Build an auto-context message using real task + entity data.
 */
export function buildAutoContextMessage(ctx: AutoContextData): string {
  const config = getTaskTypeConfig(ctx.taskTitle);
  return config.autoContextTemplate(ctx);
}

/**
 * Parse AI response content to determine which action buttons to show.
 * Smart auto-detection: defaults to the most likely save destination.
 */
export interface ParsedAction {
  type: string;
  label: string;
  content: string;
  metadata?: Record<string, any>;
}

export function parseResponseActions(content: string, taskContext?: { listingId?: string | null; buyerId?: string | null }): ParsedAction[] {
  const actions: ParsedAction[] = [];
  const detectedTypes = new Set<string>();

  // 1. Check for checklist / task list items
  const taskListPattern = /(?:^|\n)\s*[-•✓☐*]\s+(?:\[[ x]\]\s+)?.+/gm;
  const taskMatches = content.match(taskListPattern);
  if (taskMatches && taskMatches.length >= 2) {
    const taskItems = taskMatches
      .map(m => m.trim().replace(/^[-•✓☐*]\s+/, '').replace(/^\[[ x]\]\s+/, ''))
      .filter(t => t.length > 5 && t.length < 200);
    if (taskItems.length >= 2) {
      actions.push({
        type: 'create_tasks',
        label: `Create ${taskItems.length} Tasks`,
        content: taskItems.join('\n'),
      });
      detectedTypes.add('create_tasks');
    }
  }

  // 2. Check for follow-up suggestions
  const followUpPattern = /follow[- ]?up|remind|check back|circle back|revisit/i;
  if (followUpPattern.test(content) && !detectedTypes.has('create_tasks')) {
    actions.push({
      type: 'create_follow_up',
      label: 'Create Follow-Up',
      content,
    });
    detectedTypes.add('create_follow_up');
  }

  // 3. Smart listing destination detection (only if linked to listing)
  if (taskContext?.listingId) {
    const lower = content.toLowerCase();

    // Description detection
    const isDescription = /listing description|mls description|property description/i.test(lower) &&
      content.length > 100;
    // Highlights detection
    const isHighlights = /key features|property highlights|selling points|feature list/i.test(lower);
    // Marketing detection
    const isMarketing = /marketing copy|social media post|email campaign|ad copy|promotional/i.test(lower);
    // Research/analysis detection
    const isResearch = /comparable|comps|market analysis|research|findings|based on external/i.test(lower);

    if (isDescription) {
      // Default: Save to Listing Description (primary action)
      actions.push({
        type: 'save_to_listing_description',
        label: 'Save to Description',
        content,
        metadata: { listingId: taskContext.listingId },
      });
      detectedTypes.add('save_to_listing');
    } else if (isHighlights) {
      actions.push({
        type: 'save_to_listing_highlights',
        label: 'Save to Highlights',
        content,
        metadata: { listingId: taskContext.listingId },
      });
      detectedTypes.add('save_to_listing');
    } else if (isMarketing) {
      actions.push({
        type: 'save_to_listing_marketing',
        label: 'Save Marketing Copy',
        content,
        metadata: { listingId: taskContext.listingId },
      });
      detectedTypes.add('save_to_listing');
    } else if (isResearch) {
      actions.push({
        type: 'save_to_listing_notes',
        label: 'Save to Listing Notes',
        content,
        metadata: { listingId: taskContext.listingId },
      });
      detectedTypes.add('save_to_listing');
    }

    // If we detected a specific type, also offer the generic save as secondary
    if (detectedTypes.has('save_to_listing') && content.length > 150) {
      // Add a secondary "Save to Notes" option
      actions.push({
        type: 'save_notes',
        label: 'Save to Task Notes',
        content,
      });
      detectedTypes.add('save_notes');
    }

    // If linked to listing but no specific type detected, offer generic save
    if (!detectedTypes.has('save_to_listing') && content.length > 100) {
      actions.push({
        type: 'save_to_listing',
        label: 'Save to Listing',
        content,
        metadata: { listingId: taskContext.listingId },
      });
      detectedTypes.add('save_to_listing');
    }
  }

  // 4. Draft-like content
  const draftPatterns = [
    /subject:/i, /dear\s/i, /hi\s/i, /hello\s/i,
    /draft/i, /template/i,
    /^#{1,3}\s+.*(draft|email|message|template)/im,
  ];
  const hasDraftContent = draftPatterns.some(p => p.test(content));
  if (hasDraftContent && content.length > 100 && !detectedTypes.has('save_to_listing')) {
    actions.push({
      type: 'save_draft',
      label: 'Save Draft',
      content,
    });
    detectedTypes.add('save_draft');
  }

  // 5. Save to notes (for substantial content not already captured)
  if (!detectedTypes.has('save_notes') && !detectedTypes.has('save_draft') && content.length > 150) {
    actions.push({
      type: 'save_notes',
      label: 'Save to Notes',
      content,
    });
    detectedTypes.add('save_notes');
  }

  return actions;
}
