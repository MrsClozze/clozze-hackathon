/**
 * Lightweight per-record workflow state persistence using localStorage.
 * Tracks completed AI actions, last recommended step, and resume context.
 * Scoped to individual listing/buyer records — no cross-record behavior.
 */

export interface WorkflowAction {
  key: string;          // e.g. 'generate_description', 'structure_needs'
  label: string;
  completedAt: string;  // ISO timestamp
}

export interface RecordWorkflowState {
  recordId: string;
  recordType: 'listing' | 'buyer';
  /** Ordered list of completed AI actions */
  completedActions: WorkflowAction[];
  /** Key of the last recommended next step */
  lastNextStepKey: string | null;
  /** Key of the action just completed (for progression) */
  lastCompletedActionKey: string | null;
  /** Whether a grouped flow is currently in progress */
  groupedFlowInProgress: string | null;
  /** Timestamp of last interaction */
  lastInteractionAt: string;
}

const STORAGE_PREFIX = 'clozze_workflow_';
const MAX_ACTIONS = 50; // prevent unbounded growth

function storageKey(recordType: string, recordId: string): string {
  return `${STORAGE_PREFIX}${recordType}_${recordId}`;
}

export function getWorkflowState(recordType: 'listing' | 'buyer', recordId: string): RecordWorkflowState {
  try {
    const raw = localStorage.getItem(storageKey(recordType, recordId));
    if (raw) return JSON.parse(raw);
  } catch { /* corrupt data, return fresh */ }
  return {
    recordId,
    recordType,
    completedActions: [],
    lastNextStepKey: null,
    lastCompletedActionKey: null,
    groupedFlowInProgress: null,
    lastInteractionAt: new Date().toISOString(),
  };
}

export function saveWorkflowState(state: RecordWorkflowState): void {
  try {
    // Trim old actions to prevent unbounded growth
    if (state.completedActions.length > MAX_ACTIONS) {
      state.completedActions = state.completedActions.slice(-MAX_ACTIONS);
    }
    state.lastInteractionAt = new Date().toISOString();
    localStorage.setItem(storageKey(state.recordType, state.recordId), JSON.stringify(state));
  } catch { /* storage full or unavailable */ }
}

export function recordAction(
  recordType: 'listing' | 'buyer',
  recordId: string,
  actionKey: string,
  actionLabel: string,
): RecordWorkflowState {
  const state = getWorkflowState(recordType, recordId);
  // Avoid duplicates for the same action key within 1 minute
  const recentDupe = state.completedActions.find(
    a => a.key === actionKey && (Date.now() - new Date(a.completedAt).getTime()) < 60_000
  );
  if (!recentDupe) {
    state.completedActions.push({
      key: actionKey,
      label: actionLabel,
      completedAt: new Date().toISOString(),
    });
  }
  state.lastCompletedActionKey = actionKey;
  saveWorkflowState(state);
  return state;
}

export function setLastNextStep(
  recordType: 'listing' | 'buyer',
  recordId: string,
  stepKey: string | null,
): void {
  const state = getWorkflowState(recordType, recordId);
  state.lastNextStepKey = stepKey;
  saveWorkflowState(state);
}

export function setGroupedFlowInProgress(
  recordType: 'listing' | 'buyer',
  recordId: string,
  flowName: string | null,
): void {
  const state = getWorkflowState(recordType, recordId);
  state.groupedFlowInProgress = flowName;
  saveWorkflowState(state);
}

/** Check if a specific action was already completed for this record */
export function wasActionCompleted(
  recordType: 'listing' | 'buyer',
  recordId: string,
  actionKey: string,
): boolean {
  const state = getWorkflowState(recordType, recordId);
  return state.completedActions.some(a => a.key === actionKey);
}

/** Get a resume summary for display */
export function getResumeSummary(
  recordType: 'listing' | 'buyer',
  recordId: string,
): { hasHistory: boolean; lastAction: WorkflowAction | null; actionCount: number; lastInteraction: Date | null } {
  const state = getWorkflowState(recordType, recordId);
  const actions = state.completedActions;
  return {
    hasHistory: actions.length > 0,
    lastAction: actions.length > 0 ? actions[actions.length - 1] : null,
    actionCount: actions.length,
    lastInteraction: state.lastInteractionAt ? new Date(state.lastInteractionAt) : null,
  };
}
