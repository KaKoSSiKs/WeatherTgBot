/**
 * Forecast Keyboard
 * 
 * Клавиатуры для прогнозов погоды.
 */

import { Markup } from 'telegraf';
import { ForecastCallback, WeatherCallback, NotificationCallback, NavCallback } from './callback-data';

/**
 * Клавиатура для сообщения с прогнозом
 */
export function getForecastKeyboard(
  locationId: number,
  userId: number,
  forecastType: string = 'day',
  date?: string
) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('📍 Сменить город', WeatherCallback.create('change_location', locationId, 'forecast')),
      Markup.button.callback('🔄 Обновить', ForecastCallback.create(forecastType, locationId, date, 'forecast')),
    ],
    [
      Markup.button.callback('📅 На день', ForecastCallback.create('day', locationId, undefined, 'forecast')),
      Markup.button.callback('📅 На 3 дня', ForecastCallback.create('3day', locationId, undefined, 'forecast')),
    ],
    [
      Markup.button.callback('📅 На 7 дней', ForecastCallback.create('7day', locationId, undefined, 'forecast')),
      Markup.button.callback('📅 На 10 дней', ForecastCallback.create('10day', locationId, undefined, 'forecast')),
    ],
    [
      Markup.button.callback('🔔 Уведомить', NotificationCallback.create('add', 0, 'forecast')),
    ],
    [
      Markup.button.callback('⬅️ В главное меню', NavCallback.create('main_menu')),
    ],
  ]);
}

