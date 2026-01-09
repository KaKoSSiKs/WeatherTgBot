/**
 * Forecast Keyboards
 * 
 * Клавиатуры для сценариев прогнозов.
 */

import { Markup } from 'telegraf';
import { ForecastCallback, WeatherCallback, NotificationCallback } from './callback_data';
import { addNavigationButtons } from './navigation';

/**
 * Клавиатура навигации после показа прогноза
 */
export function getForecastNavigationKeyboard(
  forecastType: string,
  locationId: number,
  userId: number,
  fromMenu: boolean = true
): ReturnType<typeof Markup.inlineKeyboard> {
  const keyboard: any[][] = [];
  
  // Кнопка смены города
  keyboard.push([
    Markup.button.callback('📍 Сменить город', WeatherCallback.create('change_city', locationId, 'forecast'))
  ]);
  
  // Определяем, какие кнопки прогнозов показывать
  const forecastButtons: any[] = [];
  
  if (forecastType !== 'day') {
    forecastButtons.push(Markup.button.callback('📅 На день', ForecastCallback.create('day', locationId, 'today', 'navigation')));
  }
  
  if (forecastType !== '3day') {
    forecastButtons.push(Markup.button.callback('📅 На 3 дня', ForecastCallback.create('3day', locationId, 'today', 'navigation')));
  }
  
  if (forecastType !== '7day') {
    forecastButtons.push(Markup.button.callback('📅 На 7 дней', ForecastCallback.create('7day', locationId, 'today', 'navigation')));
  }
  
  if (forecastType !== '10day') {
    forecastButtons.push(Markup.button.callback('📅 На 10 дней', ForecastCallback.create('10day', locationId, 'today', 'navigation')));
  }
  
  // Разбиваем кнопки прогнозов на строки по 2
  for (let i = 0; i < forecastButtons.length; i += 2) {
    const row = [forecastButtons[i]];
    if (i + 1 < forecastButtons.length) {
      row.push(forecastButtons[i + 1]);
    }
    keyboard.push(row);
  }
  
  return Markup.inlineKeyboard(addNavigationButtons(keyboard, userId));
}

/**
 * Клавиатура для детального прогноза
 */
export function getDetailedForecastKeyboard(
  locationId: number,
  fromForecastType: string,
  userId: number,
  dateStr?: string
): ReturnType<typeof Markup.inlineKeyboard> {
  const keyboard: any[][] = [];
  
  // Кнопка смены города
  keyboard.push([
    Markup.button.callback('📍 Сменить город', WeatherCallback.create('change_city', locationId, 'detailed_forecast'))
  ]);
  
  // Кнопки других типов прогнозов
  const forecastButtons: any[] = [];
  
  if (fromForecastType !== 'day') {
    forecastButtons.push(Markup.button.callback('📅 На день', ForecastCallback.create('day', locationId, 'today', 'detailed')));
  }
  
  if (fromForecastType !== '3day') {
    forecastButtons.push(Markup.button.callback('📅 На 3 дня', ForecastCallback.create('3day', locationId, 'today', 'detailed')));
  }
  
  if (fromForecastType !== '7day') {
    forecastButtons.push(Markup.button.callback('📅 На 7 дней', ForecastCallback.create('7day', locationId, 'today', 'detailed')));
  }
  
  if (fromForecastType !== '10day') {
    forecastButtons.push(Markup.button.callback('📅 На 10 дней', ForecastCallback.create('10day', locationId, 'today', 'detailed')));
  }
  
  // Разбиваем на строки по 2 кнопки
  for (let i = 0; i < forecastButtons.length; i += 2) {
    const row = [forecastButtons[i]];
    if (i + 1 < forecastButtons.length) {
      row.push(forecastButtons[i + 1]);
    }
    keyboard.push(row);
  }
  
  // Кнопка почасового прогноза (если есть дата)
  if (dateStr) {
    keyboard.push([
      Markup.button.callback('⏱️ Показать прогноз по часам', ForecastCallback.create('hourly', locationId, dateStr, 'detailed'))
    ]);
  }
  
  // Кнопка уведомления
  keyboard.push([
    Markup.button.callback('🔔 Уведомить', NotificationCallback.create('add', 0, 'forecast_detailed'))
  ]);
  
  // Кнопка обновления (если есть дата)
  if (dateStr) {
    keyboard.push([
      Markup.button.callback('🔄 Обновить', `forecast:detailed_refresh:${locationId}:${dateStr}:${fromForecastType}`)
    ]);
  }
  
  return Markup.inlineKeyboard(addNavigationButtons(keyboard, userId));
}

/**
 * Клавиатура для краткого прогноза на день
 */
export function getDailyForecastItemKeyboard(
  locationId: number,
  dateStr: string,
  userId: number
): ReturnType<typeof Markup.inlineKeyboard> {
  const keyboard = [
    [
      Markup.button.callback('🔍 Подробный прогноз', ForecastCallback.create('detailed', locationId, dateStr, 'forecast'))
    ],
    [
      Markup.button.callback('🔔 Уведомить', NotificationCallback.create('add', 0, 'forecast'))
    ]
  ];

  return Markup.inlineKeyboard(addNavigationButtons(keyboard, userId));
}

/**
 * Клавиатура для почасового прогноза
 */
export function getHourlyForecastKeyboard(
  locationId: number,
  userId: number,
  dateStr?: string,
  fromDetailed?: boolean
): ReturnType<typeof Markup.inlineKeyboard> {
  const keyboard: any[][] = [];
  
  // Кнопка возврата к детальному прогнозу (если открыли из детального)
  if (fromDetailed && dateStr) {
    keyboard.push([
      Markup.button.callback('⬅️ К детальному прогнозу', ForecastCallback.create('detailed', locationId, dateStr, 'hourly'))
    ]);
  }
  
  return Markup.inlineKeyboard(addNavigationButtons(keyboard, userId));
}

