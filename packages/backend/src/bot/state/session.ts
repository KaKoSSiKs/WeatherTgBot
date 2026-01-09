/**
 * Session State Management
 * 
 * Управление состояниями диалогов и потоков для пользователей.
 */

export type FlowType = 'setup' | 'add' | 'add_city' | 'nlp_confirm' | 'notification_create';

export type SetupStep =
  | 'location'
  | 'preferences'
  | 'time'
  | 'confirm';

export type NotificationCreateStep = 
  | 'type' 
  | 'subtype' 
  | 'city' 
  | 'city_input'
  | 'time' 
  | 'time_input'
  | 'frequency' 
  | 'temp_direction'
  | 'temp_threshold'
  | 'temp_threshold_input'
  | 'precip_type'
  | 'precip_event'
  | 'wind_threshold'
  | 'wind_threshold_input'
  | 'check_interval'
  | 'check_interval_input'
  | 'confirm'
  | 'name_input';

export type FlowStep = SetupStep | NotificationCreateStep | string;

export interface FlowState {
  flow: FlowType;
  step: FlowStep;
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

/**
 * Упрощенные функции для совместимости
 */
export function getState(userId: number, flow: FlowType): FlowState | undefined {
  const state = getFlowState(userId);
  if (state && state.flow === flow) {
    return state;
  }
  return undefined;
}

export function setState(userId: number, flow: FlowType, stateData: { step: FlowStep; data: Record<string, unknown> }): void {
  setFlowState(userId, {
    flow,
    step: stateData.step,
    data: stateData.data,
    updatedAt: Date.now(),
    expiresAt: Date.now() + STATE_TTL
  });
}

export function clearState(userId: number, flow: FlowType): void {
  const state = getFlowState(userId);
  if (state && state.flow === flow) {
    clearFlowState(userId);
  }
}

