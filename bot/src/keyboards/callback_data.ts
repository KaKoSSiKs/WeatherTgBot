/**
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
 * Примеры: menu:current_weather, menu:forecast_day, menu:settings
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
 * action: change_city, refresh, show
 * source: main_menu, back, current_weather
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
 * type: day, 3day, 7day, 10day, detailed, hourly
 * from: main_menu, current_weather, forecast_3day, etc.
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
 * action: back, main_menu, cancel
 * previous_state: JSON string с предыдущим состоянием
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
 * section: main, cities, parameters, notifications, appearance
 * action: show, add, delete, toggle, set_main
 * param: зависит от section
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
 * Формат: notification:action:id:step
 * action: add, edit, delete, toggle, confirm
 * id: 0 для новых, >0 для существующих
 * step: city, time, type, confirm
 */
export const NotificationCallback = {
  prefix: 'notification',
  create: (action: string, id?: string | number, step?: string) =>
    createCallbackData('notification', action, id, step),
  parse: (data: string) => {
    const parsed = parseCallbackData(data);
    if (parsed.prefix !== 'notification' || parsed.params.length < 1) return null;
    return {
      action: parsed.params[0],
      id: parsed.params[1] ? Number(parsed.params[1]) : undefined,
      step: parsed.params[2]
    };
  }
} as const;

