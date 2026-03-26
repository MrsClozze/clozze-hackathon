import { DurableMemoryState, ActionRecord } from './types';

/**
 * Builds actionable context from Durable Object memory.
 * Groups related pending items, separates completed from unresolved,
 * and instructs the AI to proactively guide the user.
 */
export function buildMemoryContext(
  memory: DurableMemoryState | null,
  type: 'listing' | 'buyer' | null
): string | null {
  if (!memory || (memory.conversationHistory.length === 0 && memory.actions.length === 0)) {
    return null;
  }

  const entityLabel = type === 'listing' ? 'listing' : 'buyer';
  let context = `[MEMORY CONTEXT — ${entityLabel}]\n`;

  // ── Action continuity: separate completed vs pending ──
  const pendingActions = memory.actions.filter(a => a.status === 'pending');
  const completedActions = memory.actions.filter(a => a.status === 'completed');
  const failedActions = memory.actions.filter(a => a.status === 'failed');

  if (completedActions.length > 0) {
    const recent = completedActions.slice(-8);
    context += `\nCompleted actions:\n`;
    for (const a of recent) {
      context += `  ✓ ${a.action}${a.details ? ` — ${a.details}` : ''}\n`;
    }
  }

  // Group related pending actions
  if (pendingActions.length > 0) {
    const groups = groupRelatedActions(pendingActions);

    if (groups.length > 0) {
      context += `\nUnresolved items requiring attention:\n`;
      for (const group of groups) {
        if (group.items.length === 1) {
          const a = group.items[0];
          context += `  ⏳ ${a.action}${a.details ? ` — ${a.details}` : ''}\n`;
        } else {
          context += `  ⏳ [GROUP] ${group.label} (${group.items.length} related items):\n`;
          for (const a of group.items) {
            context += `     - ${a.action}${a.details ? `: ${a.details}` : ''}\n`;
          }
          context += `     → Suggest resolving these together in a single step.\n`;
        }
      }
    }
  }

  if (failedActions.length > 0) {
    const recent = failedActions.slice(-3);
    context += `\nFailed actions (may need retry):\n`;
    for (const a of recent) {
      context += `  ✗ ${a.action}${a.details ? ` — ${a.details}` : ''}\n`;
    }
  }

  // ── Workflow state / outstanding items ──
  const wfKeys = Object.keys(memory.workflowState);
  if (wfKeys.length > 0) {
    context += `\nWorkflow state: ${JSON.stringify(memory.workflowState)}\n`;
    const missing = memory.workflowState.missingFields;
    if (Array.isArray(missing) && missing.length > 0) {
      context += `Outstanding missing fields: ${missing.join(', ')}\n`;
    }
    const phase = memory.workflowState.currentPhase;
    if (phase) {
      context += `Current phase: ${phase}\n`;
    }
  }

  // ── Recent conversation (last 10 turns) ──
  if (memory.conversationHistory.length > 0) {
    const recentHistory = memory.conversationHistory.slice(-10);
    context += `\nRecent conversation:\n`;
    for (const entry of recentHistory) {
      const role = entry.role === 'user' ? 'User' : 'Assistant';
      const content =
        entry.content.length > 300
          ? entry.content.substring(0, 300) + '…'
          : entry.content;
      context += `${role}: ${content}\n`;
    }
  }

  // ── Behavioral instructions ──
  context += `\n--- BEHAVIORAL GUIDANCE ---\n`;
  context += `You are managing this ${entityLabel}'s workflow. Your job is to drive progress, not just respond.\n`;

  if (pendingActions.length > 0) {
    context += `There are ${pendingActions.length} unresolved item(s). You MUST:\n`;
    context += `  1. Acknowledge what's already been done (completed actions)\n`;
    context += `  2. Proactively surface what still needs attention — don't wait for the user to ask\n`;
    context += `  3. Recommend a specific next step to resolve the most important pending item\n`;
    context += `  4. If multiple pending items relate to the same issue, suggest resolving them together\n`;
  } else if (completedActions.length > 0) {
    context += `All prior actions are completed. Look for the next logical step in the workflow.\n`;
  }

  context += `Never ask for information already present in this context or in the record data.\n`;
  context += `For voice (conversational) responses: lead with the single most important pending item.\n`;
  context += `[END MEMORY CONTEXT]\n`;

  return context;
}

/**
 * Group related pending actions by keyword similarity.
 * E.g. "get seller info" and "confirm seller email" → grouped under "Seller Information"
 */
function groupRelatedActions(actions: ActionRecord[]): { label: string; items: ActionRecord[] }[] {
  const CATEGORY_KEYWORDS: Record<string, string[]> = {
    'Seller Information': ['seller', 'owner', 'vendor'],
    'Buyer Details': ['buyer', 'client', 'borrower', 'pre-approval', 'pre-approved'],
    'Property Data': ['property', 'listing', 'address', 'mls', 'inspection', 'appraisal', 'survey'],
    'Documentation': ['document', 'contract', 'disclosure', 'title', 'sign', 'docusign'],
    'Financial': ['commission', 'price', 'escrow', 'financing', 'lender', 'loan'],
    'Communication': ['email', 'message', 'call', 'contact', 'reach out', 'follow up', 'draft'],
    'Scheduling': ['schedule', 'showing', 'appointment', 'calendar', 'date', 'deadline'],
  };

  const grouped: Map<string, ActionRecord[]> = new Map();
  const ungrouped: ActionRecord[] = [];

  for (const action of actions) {
    const text = `${action.action} ${action.details || ''}`.toLowerCase();
    let matched = false;

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (keywords.some(kw => text.includes(kw))) {
        if (!grouped.has(category)) grouped.set(category, []);
        grouped.get(category)!.push(action);
        matched = true;
        break;
      }
    }

    if (!matched) ungrouped.push(action);
  }

  const result: { label: string; items: ActionRecord[] }[] = [];

  for (const [label, items] of grouped) {
    result.push({ label, items });
  }

  // Ungrouped actions remain individual
  for (const item of ungrouped) {
    result.push({ label: item.action, items: [item] });
  }

  return result;
}

/**
 * Extract action markers from an AI response for tracking.
 * Looks for [ACTION:...] markers in the response text.
 */
export function extractActionsFromResponse(content: string): string[] {
  const actions: string[] = [];
  const regex = /\[ACTION:([^\]]+)\]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    actions.push(match[1].trim());
  }
  return actions;
}
