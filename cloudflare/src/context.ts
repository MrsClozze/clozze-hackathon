import { DurableMemoryState } from './types';

/**
 * Builds actionable context from Durable Object memory.
 * Separates completed work from unresolved/pending items
 * so the AI can reason about what still needs attention.
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

  if (pendingActions.length > 0) {
    context += `\nPending / unresolved actions (still need attention):\n`;
    for (const a of pendingActions) {
      context += `  ⏳ ${a.action}${a.details ? ` — ${a.details}` : ''}\n`;
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

    // Surface specific unresolved items if tracked
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

  // ── Guidance instruction ──
  context += `\nIMPORTANT: Reference the above context to avoid asking the user for information already discussed. `;
  context += `Prioritize addressing pending/unresolved items. Do not repeat completed actions.\n`;
  context += `[END MEMORY CONTEXT]\n`;

  return context;
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
