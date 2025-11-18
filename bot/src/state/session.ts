export type FlowType = 'setup' | 'add' | 'nlp_confirm';

export type SetupStep =
  | 'location'
  | 'preferences'
  | 'time'
  | 'confirm';

export interface FlowState {
  flow: FlowType;
  step: SetupStep;
  data: Record<string, unknown>;
  updatedAt: number;
  expiresAt: number;
}

const STATE_TTL = 1000 * 60 * 5; // 5 minutes
const stateStore = new Map<number, FlowState>();

function isExpired(state: FlowState): boolean {
  return Date.now() > state.expiresAt;
}

export function getFlowState(userId: number): FlowState | undefined {
  const state = stateStore.get(userId);
  if (!state) {
    return undefined;
  }
  if (isExpired(state)) {
    stateStore.delete(userId);
    return undefined;
  }
  return state;
}

export function setFlowState(userId: number, state: FlowState): void {
  stateStore.set(userId, {
    ...state,
    updatedAt: Date.now(),
    expiresAt: Date.now() + STATE_TTL
  });
}

export function clearFlowState(userId: number): void {
  stateStore.delete(userId);
}

export function refreshFlowState(userId: number): void {
  const state = stateStore.get(userId);
  if (!state) return;
  stateStore.set(userId, {
    ...state,
    updatedAt: Date.now(),
    expiresAt: Date.now() + STATE_TTL
  });
}

export function getStateSnapshot() {
  return {
    size: stateStore.size
  };
}

