/**
 * Callback Data Parsing
 * 
 * Утилиты для парсинга callback data в Telegram.
 */

/**
 * Парсит callback data строку
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
    params: parts.slice(1),
  };
}

/**
 * Создает callback data строку
 */
export function createCallbackData(prefix: string, ...params: (string | number | undefined)[]): string {
  const validParams = params
    .filter((p) => p !== undefined && p !== null)
    .map((p) => String(p));
  return [prefix, ...validParams].join(':');
}

/**
 * Menu Callback
 * Формат: menu:action
 */
export const MenuCallback = {
  prefix: 'menu',
  create: (action: string) => createCallbackData('menu', action),
  parse: (data: string) => {
    const parsed = parseCallbackData(data);
    if (parsed.prefix !== 'menu' || parsed.params.length < 1) return null;
    return { action: parsed.params[0] };
  },
} as const;

/**
 * Weather Callback
 * Формат: weather:action:locationId:source
 */
export const WeatherCallback = {
  prefix: 'weather',
  create: (action: string, locationId?: string | number, source?: string) =>
    createCallbackData('weather', action, locationId, source),
  parse: (data: string) => {
    const parsed = parseCallbackData(data);
    if (parsed.prefix !== 'weather' || parsed.params.length < 1) return null;
    return {
      action: parsed.params[0],
      locationId: parsed.params[1] ? Number(parsed.params[1]) : undefined,
      source: parsed.params[2],
    };
  },
} as const;

/**
 * Forecast Callback
 * Формат: forecast:type:locationId:date:from
 */
export const ForecastCallback = {
  prefix: 'forecast',
  create: (type: string, locationId?: string | number, date?: string, from?: string) =>
    createCallbackData('forecast', type, locationId, date, from),
  parse: (data: string) => {
    const parsed = parseCallbackData(data);
    if (parsed.prefix !== 'forecast' || parsed.params.length < 1) return null;
    return {
      type: parsed.params[0],
      locationId: parsed.params[1] ? Number(parsed.params[1]) : undefined,
      date: parsed.params[2],
      from: parsed.params[3],
    };
  },
} as const;

/**
 * Settings Callback
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
      param: parsed.params[2],
    };
  },
} as const;

/**
 * Notification Callback
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
      param2: parsed.params[3],
    };
  },
} as const;

/**
 * Navigation Callback
 * Формат: nav:action:previousState
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
      previousState: parsed.params[1],
    };
  },
} as const;

