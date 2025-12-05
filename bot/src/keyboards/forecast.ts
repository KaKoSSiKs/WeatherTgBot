/**
 * Клавиатуры для сценариев прогнозов
 */

import { InlineKeyboard } from 'grammy';
import { ForecastCallback, WeatherCallback, NotificationCallback, NavCallback } from './callback_data';
import { addNavigationButtons } from './navigation';
import { getPreviousNavigationState } from '../utils/navigation';

/**
 * Клавиатура навигации после показа прогноза
 */
export function getForecastNavigationKeyboard(
  forecastType: string,
  locationId: number,
  userId: number,
  fromMenu: boolean = true
): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  
  // Кнопка смены города
  keyboard
    .text('📍 Сменить город', WeatherCallback.create('change_city', locationId, 'forecast'))
    .row();
  
  // Определяем, какие кнопки прогнозов показывать
  // Не показываем текущий тип прогноза
  const forecastButtons: Array<{ text: string; callbackData: string }> = [];
  
  if (forecastType !== 'day') {
    forecastButtons.push({
      text: '📅 На день',
      callbackData: ForecastCallback.create('day', locationId, 'today', 'navigation')
    });
  }
  
  if (forecastType !== '3day') {
    forecastButtons.push({
      text: '📅 На 3 дня',
      callbackData: ForecastCallback.create('3day', locationId, 'today', 'navigation')
    });
  }
  
  if (forecastType !== '7day') {
    forecastButtons.push({
      text: '📅 На 7 дней',
      callbackData: ForecastCallback.create('7day', locationId, 'today', 'navigation')
    });
  }
  
  if (forecastType !== '10day') {
    forecastButtons.push({
      text: '📅 На 10 дней',
      callbackData: ForecastCallback.create('10day', locationId, 'today', 'navigation')
    });
  }
  
  // Разбиваем кнопки прогнозов на строки по 2
  for (let i = 0; i < forecastButtons.length; i += 2) {
    if (i + 1 < forecastButtons.length) {
      keyboard
        .text(forecastButtons[i].text, forecastButtons[i].callbackData)
        .text(forecastButtons[i + 1].text, forecastButtons[i + 1].callbackData)
        .row();
    } else {
      keyboard
        .text(forecastButtons[i].text, forecastButtons[i].callbackData)
        .row();
    }
  }
  
  // Навигационные кнопки
  addNavigationButtons(keyboard, userId);
  
  return keyboard;
}

/**
 * Клавиатура для детального прогноза
 */
export function getDetailedForecastKeyboard(
  locationId: number,
  fromForecastType: string,
  userId: number,
  dateStr?: string
): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  
  // Кнопка смены города
  keyboard
    .text('📍 Сменить город', WeatherCallback.create('change_city', locationId, 'detailed_forecast'))
    .row();
  
  // Кнопки других типов прогнозов (не показываем текущий)
  const forecastButtons: Array<{ text: string; callbackData: string }> = [];
  
  if (fromForecastType !== 'day') {
    forecastButtons.push({
      text: '📅 На день',
      callbackData: ForecastCallback.create('day', locationId, 'today', 'detailed')
    });
  }
  
  if (fromForecastType !== '3day') {
    forecastButtons.push({
      text: '📅 На 3 дня',
      callbackData: ForecastCallback.create('3day', locationId, 'today', 'detailed')
    });
  }
  
  if (fromForecastType !== '7day') {
    forecastButtons.push({
      text: '📅 На 7 дней',
      callbackData: ForecastCallback.create('7day', locationId, 'today', 'detailed')
    });
  }
  
  if (fromForecastType !== '10day') {
    forecastButtons.push({
      text: '📅 На 10 дней',
      callbackData: ForecastCallback.create('10day', locationId, 'today', 'detailed')
    });
  }
  
  // Разбиваем на строки по 2 кнопки
  for (let i = 0; i < forecastButtons.length; i += 2) {
    if (i + 1 < forecastButtons.length) {
      keyboard
        .text(forecastButtons[i].text, forecastButtons[i].callbackData)
        .text(forecastButtons[i + 1].text, forecastButtons[i + 1].callbackData)
        .row();
    } else {
      keyboard
        .text(forecastButtons[i].text, forecastButtons[i].callbackData)
        .row();
    }
  }
  
  // Кнопка почасового прогноза (если есть дата)
  if (dateStr) {
    keyboard
      .text('⏱️ Показать прогноз по часам', ForecastCallback.create('hourly', locationId, dateStr, 'detailed'))
      .row();
  }
  
  // Кнопка уведомления
  keyboard
    .text('🔔 Уведомить', NotificationCallback.create('add', 0, 'forecast_detailed'))
    .row();
  
  // Навигационные кнопки
  addNavigationButtons(keyboard, userId);
  
  return keyboard;
}

/**
 * Клавиатура для краткого прогноза на день (с кнопками "Подробный прогноз" и "Уведомить")
 */
export function getDailyForecastItemKeyboard(
  locationId: number,
  dateStr: string,
  userId: number
): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  
  keyboard
    .text('🔍 Подробный прогноз', ForecastCallback.create('detailed', locationId, dateStr, 'forecast'))
    .row()
    .text('🔔 Уведомить', NotificationCallback.create('add', 0, 'forecast'))
    .row();
  
  // Навигационные кнопки
  addNavigationButtons(keyboard, userId);
  
  return keyboard;
}

/**
 * Клавиатура для почасового прогноза
 */
export function getHourlyForecastKeyboard(
  locationId: number,
  userId: number
): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  
  // Навигационные кнопки
  addNavigationButtons(keyboard, userId);
  
  return keyboard;
}

