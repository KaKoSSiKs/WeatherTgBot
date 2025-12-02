/**
 * Менеджер навигации с историей переходов.
 * Хранит историю переходов для каждого пользователя в памяти.
 * Максимальная глубина истории - 10 шагов.
 */

export interface NavigationState {
  screen: string;
  messageId?: number;
  data?: Record<string, unknown>;
  timestamp: number;
}

interface UserNavigationHistory {
  userId: number;
  history: NavigationState[];
  maxDepth: number;
}

const navigationStore = new Map<number, UserNavigationHistory>();

const MAX_HISTORY_DEPTH = 10;

/**
 * Инициализирует или получает историю навигации для пользователя
 */
function getUserHistory(userId: number): UserNavigationHistory {
  if (!navigationStore.has(userId)) {
    navigationStore.set(userId, {
      userId,
      history: [],
      maxDepth: MAX_HISTORY_DEPTH
    });
  }
  return navigationStore.get(userId)!;
}

/**
 * Добавляет новый шаг в историю навигации
 */
export function pushNavigationState(
  userId: number,
  screen: string,
  data?: Record<string, unknown>,
  messageId?: number
): void {
  const history = getUserHistory(userId);
  const newState: NavigationState = {
    screen,
    messageId,
    data,
    timestamp: Date.now()
  };

  history.history.push(newState);

  // Ограничиваем глубину истории
  if (history.history.length > history.maxDepth) {
    history.history.shift(); // Удаляем самый старый элемент
  }
}

/**
 * Получает предыдущий шаг из истории и удаляет его
 */
export function popNavigationState(userId: number): NavigationState | null {
  const history = getUserHistory(userId);
  if (history.history.length === 0) {
    return null;
  }

  // Удаляем текущий шаг (последний)
  history.history.pop();

  // Возвращаем предыдущий шаг (теперь последний)
  if (history.history.length === 0) {
    return null;
  }

  return history.history[history.history.length - 1];
}

/**
 * Получает текущий шаг без удаления
 */
export function getCurrentNavigationState(userId: number): NavigationState | null {
  const history = getUserHistory(userId);
  if (history.history.length === 0) {
    return null;
  }
  return history.history[history.history.length - 1];
}

/**
 * Получает предыдущий шаг без удаления
 */
export function getPreviousNavigationState(userId: number): NavigationState | null {
  const history = getUserHistory(userId);
  if (history.history.length < 2) {
    return null;
  }
  return history.history[history.history.length - 2];
}

/**
 * Очищает историю навигации для пользователя
 */
export function clearNavigationHistory(userId: number): void {
  navigationStore.delete(userId);
}

/**
 * Сбрасывает навигацию и устанавливает главное меню как текущий шаг
 */
export function resetToMainMenu(userId: number): void {
  clearNavigationHistory(userId);
  pushNavigationState(userId, 'main_menu');
}

/**
 * Проверяет, может ли пользователь вернуться назад
 */
export function canGoBack(userId: number): boolean {
  const history = getUserHistory(userId);
  return history.history.length > 1;
}

/**
 * Получает полную историю навигации (для отладки)
 */
export function getFullHistory(userId: number): NavigationState[] {
  const history = getUserHistory(userId);
  return [...history.history];
}

