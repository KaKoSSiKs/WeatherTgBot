/**
 * Callback Data Structures
 * 
 * Модуль для определения callback data структур.
 * Все callback data должны использовать префиксы для избежания конфликтов.
 * 
 * Формат: префикс:параметр1:параметр2:параметр3
 */

/**
 * Парсит callback data строку в объект
 */
export function parseCallbackData(data: string): {
  prefix: string;
  params: string[];
} {
  const parts = data.split(':');
  if (parts.length === 0) {
    return { prefix: '', params: [] };
  }
  return {
    prefix: parts[0],
    params: parts.slice(1)
  };
}

/**
 * Создает callback data строку из префикса и параметров
 */
export function createCallbackData(prefix: string, ...params: (string | number | undefined)[]): string {
  const validParams = params
    .filter((p) => p !== undefined && p !== null)
    .map((p) => String(p));
  return [prefix, ...validParams].join(':');
}

/**
 * Главное меню
 * Формат: menu:action
 */
export const MenuCallback = {
  prefix: 'menu',
  create: (action: string) => createCallbackData('menu', action),
  parse: (data: string) => {
    const parsed = parseCallbackData(data);
    if (parsed.prefix !== 'menu' || parsed.params.length < 1) return null;
    return { action: parsed.params[0] };
  }
} as const;

/**
 * Погода
 * Формат: weather:action:city_id:source
 */
export const WeatherCallback = {
  prefix: 'weather',
  create: (action: string, cityId?: string | number, source?: string) =>
    createCallbackData('weather', action, cityId, source),
  parse: (data: string) => {
    const parsed = parseCallbackData(data);
    if (parsed.prefix !== 'weather' || parsed.params.length < 1) return null;
    return {
      action: parsed.params[0],
      cityId: parsed.params[1],
      source: parsed.params[2]
    };
  }
} as const;

/**
 * Прогнозы
 * Формат: forecast:type:city_id:date:from
 */
export const ForecastCallback = {
  prefix: 'forecast',
  create: (type: string, cityId?: string | number, date?: string, from?: string) =>
    createCallbackData('forecast', type, cityId, date, from),
  parse: (data: string) => {
    const parsed = parseCallbackData(data);
    if (parsed.prefix !== 'forecast' || parsed.params.length < 1) return null;
    return {
      type: parsed.params[0],
      cityId: parsed.params[1],
      date: parsed.params[2],
      from: parsed.params[3]
    };
  }
} as const;

/**
 * Навигация
 * Формат: nav:action:previous_state
 */
export const NavCallback = {
  prefix: 'nav',
  create: (action: string, previousState?: string) =>
    createCallbackData('nav', action, previousState),
  parse: (data: string) => {
    const parsed = parseCallbackData(data);
    if (parsed.prefix !== 'nav' || parsed.params.length < 1) return null;
    return {
      action: parsed.params[0],
      previousState: parsed.params[1]
    };
  }
} as const;

/**
 * Настройки
 * Формат: settings:section:action:param
 */
export const SettingsCallback = {
  prefix: 'settings',
  create: (section: string, action?: string, param?: string | number) =>
    createCallbackData('settings', section, action, param),
  parse: (data: string) => {
    const parsed = parseCallbackData(data);
    if (parsed.prefix !== 'settings' || parsed.params.length < 1) return null;
    return {
      section: parsed.params[0],
      action: parsed.params[1],
      param: parsed.params[2]
    };
  }
} as const;

/**
 * Уведомления
 * Формат: notification:action:id:param1:param2
 */
export const NotificationCallback = {
  prefix: 'notification',
  create: (action: string, id?: string | number, param1?: string, param2?: string) =>
    createCallbackData('notification', action, id, param1, param2),
  parse: (data: string) => {
    const parsed = parseCallbackData(data);
    if (parsed.prefix !== 'notification' || parsed.params.length < 1) return null;
    return {
      action: parsed.params[0],
      id: parsed.params[1] ? Number(parsed.params[1]) : undefined,
      param1: parsed.params[2],
      param2: parsed.params[3]
    };
  }
} as const;

/**
 * Создание уведомления (визард)
 * Формат: notif_create:step:value:extra
 */
export const NotifCreateCallback = {
  prefix: 'notif_create',
  create: (step: string, value?: string, extra?: string) =>
    createCallbackData('notif_create', step, value, extra),
  parse: (data: string) => {
    const parsed = parseCallbackData(data);
    if (parsed.prefix !== 'notif_create' || parsed.params.length < 1) return null;
    return {
      step: parsed.params[0],
      value: parsed.params[1],
      extra: parsed.params[2]
    };
  }
} as const;

