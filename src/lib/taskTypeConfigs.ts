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
 * Supports both inline [ACTION:type|label] markers and legacy pattern detection.
 */
export interface ParsedAction {
  type: string;
  label: string;
  content: string;
  metadata?: Record<string, any>;
  /** If true, this action was detected inline (within the text) */
  inline?: boolean;
  /** The position in the text where this action marker was found */
  position?: number;
}

/** Allowed action types — only these are rendered as buttons */
const VALID_ACTION_TYPES = new Set([
  'draft_message',
  'create_task',
  'create_tasks',
  'save_notes',
  'save_draft',
  'save_to_listing',
  'save_to_listing_description',
  'save_to_listing_highlights',
  'save_to_listing_notes',
  'save_to_listing_marketing',
  'resolve_group',
  'create_follow_up',
]);

/** Priority order for action types — lower number = higher priority (shown first) */
const ACTION_PRIORITY: Record<string, number> = {
  resolve_group: 0,
  draft_message: 1,
  save_to_listing_description: 2,
  save_to_listing_highlights: 3,
  save_to_listing_marketing: 4,
  save_to_listing_notes: 5,
  save_to_listing: 6,
  create_task: 7,
  create_tasks: 7,
  create_follow_up: 8,
  save_draft: 9,
  save_notes: 10,
};

/** Maximum inline action buttons shown per response to prevent button overload */
const MAX_INLINE_ACTIONS = 5;

/** Parse inline [ACTION:type|label] markers from AI response */
function parseInlineActions(content: string, taskContext?: { listingId?: string | null; buyerId?: string | null }): ParsedAction[] {
  const actions: ParsedAction[] = [];
  const pattern = /\[ACTION:(\w+)\|([^\]]+)\]/g;
  let match;

  while ((match = pattern.exec(content)) !== null) {
    const [, actionType, label] = match;

    // Skip unknown action types — prevents model from inventing unsupported actions
    if (!VALID_ACTION_TYPES.has(actionType)) continue;

    const action: ParsedAction = {
      type: actionType,
      label: label.trim(),
      content,
      inline: true,
      position: match.index,
    };

    if (actionType.startsWith('save_to_listing') && taskContext?.listingId) {
      action.metadata = { listingId: taskContext.listingId };
    }
    if (actionType === 'resolve_group') {
      action.metadata = { listingId: taskContext?.listingId, buyerId: taskContext?.buyerId };
    }

    actions.push(action);
  }

  return actions;
}

/** Strip [ACTION:...] markers from content for clean display */
export function stripActionMarkers(content: string): string {
  return content.replace(/\s*\[ACTION:\w+\|[^\]]+\]/g, '');
}

/** Strip [SPOKEN]...[/SPOKEN] and [FULL]...[/FULL] wrapper tags from dual-format responses */
export function stripConversationTags(content: string): string {
  // Remove [SPOKEN]...[/SPOKEN] block entirely
  let cleaned = content.replace(/\[SPOKEN\][\s\S]*?\[\/SPOKEN\]/g, '');
  // Remove [FULL] and [/FULL] wrapper tags but keep their content
  cleaned = cleaned.replace(/\[FULL\]/g, '').replace(/\[\/FULL\]/g, '');
  return cleaned.trim();
}

/** Parse spoken and full response from dual-format AI output */
export function parseSpokenResponse(content: string): { spoken: string; full: string } {
  const spokenMatch = content.match(/\[SPOKEN\]([\s\S]*?)\[\/SPOKEN\]/);
  const fullMatch = content.match(/\[FULL\]([\s\S]*?)\[\/FULL\]/);

  if (spokenMatch) {
    return {
      spoken: spokenMatch[1].trim(),
      full: fullMatch ? fullMatch[1].trim() : stripConversationTags(content),
    };
  }

  // Fallback: strip markdown for a natural spoken version
  const spoken = content
    .replace(/#{1,6}\s/g, '')
    .replace(/\*{1,2}(.*?)\*{1,2}/g, '$1')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/`{1,3}.*?`{1,3}/gs, '')
    .replace(/\[ACTION:.*?\]/g, '')
    .replace(/---/g, '')
    .replace(/^\s*[-*]\s/gm, '')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .trim()
    .substring(0, 500);

  return { spoken, full: content };
}

export function parseResponseActions(content: string, taskContext?: { listingId?: string | null; buyerId?: string | null }): ParsedAction[] {
  // First, check for inline action markers (new format)
  const inlineActions = parseInlineActions(content, taskContext);
  if (inlineActions.length > 0) {
    // Deduplicate by type+label
    const seen = new Set<string>();
    const deduped = inlineActions.filter(a => {
      const key = `${a.type}:${a.label}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    // Sort by priority — most important actions first
    deduped.sort((a, b) => (ACTION_PRIORITY[a.type] ?? 99) - (ACTION_PRIORITY[b.type] ?? 99));
    // Cap inline actions to prevent button overload
    return deduped.slice(0, MAX_INLINE_ACTIONS);
  }

  // Legacy fallback: pattern-based detection
  const actions: ParsedAction[] = [];
  const detectedTypes = new Set<string>();

  const taskListPattern = /(?:^|\n)\s*[-•✓☐*]\s+(?:\[[ x]\]\s+)?.+/gm;
  const taskMatches = content.match(taskListPattern);
  if (taskMatches && taskMatches.length >= 2) {
    const taskItems = taskMatches
      .map(m => m.trim().replace(/^[-•✓☐*]\s+/, '').replace(/^\[[ x]\]\s+/, ''))
      .filter(t => t.length > 5 && t.length < 200);
    if (taskItems.length >= 2) {
      actions.push({ type: 'create_tasks', label: `Create ${taskItems.length} Tasks`, content: taskItems.join('\n') });
      detectedTypes.add('create_tasks');
    }
  }

  const followUpPattern = /follow[- ]?up|remind|check back|circle back|revisit/i;
  if (followUpPattern.test(content) && !detectedTypes.has('create_tasks')) {
    actions.push({ type: 'create_follow_up', label: 'Create Follow-Up', content });
    detectedTypes.add('create_follow_up');
  }

  if (taskContext?.listingId) {
    const lower = content.toLowerCase();
    const isDescription = /listing description|mls description|property description/i.test(lower) && content.length > 100;
    const isHighlights = /key features|property highlights|selling points|feature list/i.test(lower);
    const isMarketing = /marketing copy|social media post|email campaign|ad copy/i.test(lower);
    const isResearch = /comparable|comps|market analysis|research|findings|based on external/i.test(lower);

    if (isDescription) {
      actions.push({ type: 'save_to_listing_description', label: 'Save to Description', content, metadata: { listingId: taskContext.listingId } });
      detectedTypes.add('save_to_listing');
    } else if (isHighlights) {
      actions.push({ type: 'save_to_listing_highlights', label: 'Save to Highlights', content, metadata: { listingId: taskContext.listingId } });
      detectedTypes.add('save_to_listing');
    } else if (isMarketing) {
      actions.push({ type: 'save_to_listing_marketing', label: 'Save Marketing Copy', content, metadata: { listingId: taskContext.listingId } });
      detectedTypes.add('save_to_listing');
    } else if (isResearch) {
      actions.push({ type: 'save_to_listing_notes', label: 'Save to Listing Notes', content, metadata: { listingId: taskContext.listingId } });
      detectedTypes.add('save_to_listing');
    }

    if (detectedTypes.has('save_to_listing') && content.length > 150) {
      actions.push({ type: 'save_notes', label: 'Save to Task Notes', content });
      detectedTypes.add('save_notes');
    }

    if (!detectedTypes.has('save_to_listing') && content.length > 100) {
      actions.push({ type: 'save_to_listing', label: 'Save to Listing', content, metadata: { listingId: taskContext.listingId } });
      detectedTypes.add('save_to_listing');
    }
  }

  const draftPatterns = [/subject:/i, /dear\s/i, /hi\s/i, /hello\s/i, /draft/i, /template/i, /^#{1,3}\s+.*(draft|email|message|template)/im];
  if (draftPatterns.some(p => p.test(content)) && content.length > 100 && !detectedTypes.has('save_to_listing')) {
    actions.push({ type: 'save_draft', label: 'Save Draft', content });
    detectedTypes.add('save_draft');
  }

  if (!detectedTypes.has('save_notes') && !detectedTypes.has('save_draft') && content.length > 150) {
    actions.push({ type: 'save_notes', label: 'Save to Notes', content });
  }

  return actions;
}
