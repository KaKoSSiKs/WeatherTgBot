/**
 * Weather Keyboards
 * 
 * Клавиатуры для работы с погодой.
 */

import { Markup } from 'telegraf';
import { WeatherCallback, ForecastCallback, NotificationCallback, SettingsCallback, NavCallback } from './callback-data';

/**
 * Клавиатура для сообщения с текущей погодой
 */
export function getCurrentWeatherKeyboard(
  locationId: number,
  userId: number,
  fromMenu: boolean = true
) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('📍 Сменить город', WeatherCallback.create('change_city', locationId, 'weather')),
      Markup.button.callback('🔄 Обновить', WeatherCallback.create('refresh', locationId, 'weather')),
    ],
    [
      Markup.button.callback('📅 Прогноз на день', ForecastCallback.create('day', locationId, 'today', 'weather')),
      Markup.button.callback('📅 На 3 дня', ForecastCallback.create('3day', locationId, 'today', 'weather')),
    ],
    [
      Markup.button.callback('📅 На 7 дней', ForecastCallback.create('7day', locationId, 'today', 'weather')),
      Markup.button.callback('📅 На 10 дней', ForecastCallback.create('10day', locationId, 'today', 'weather')),
    ],
    [
      Markup.button.callback('🔔 Уведомить', NotificationCallback.create('add', 0, 'weather')),
    ],
    [
      Markup.button.callback('⬅️ Главное меню', NavCallback.create('main_menu')),
    ],
  ]);
}

/**
 * Клавиатура для выбора города
 */
export function getCitySelectionKeyboard(
  locations: Array<{ id: number; name: string }>,
  userId: number,
  returnTo: string = 'weather'
) {
  const buttons: any[] = [];
  
  // Добавляем кнопки для каждого города (по 2 в ряд)
  for (let i = 0; i < locations.length; i += 2) {
    const row: any[] = [];
    row.push(Markup.button.callback(
      `📍 ${locations[i].name}`,
      WeatherCallback.create('select_city', locations[i].id, returnTo)
    ));
    
    if (i + 1 < locations.length) {
      row.push(Markup.button.callback(
        `📍 ${locations[i + 1].name}`,
        WeatherCallback.create('select_city', locations[i + 1].id, returnTo)
      ));
    }
    
    buttons.push(row);
  }
  
  // Кнопка добавления города
  buttons.push([
    Markup.button.callback('➕ Добавить город', SettingsCallback.create('cities', 'add', '0')),
  ]);
  
  // Навигация
  buttons.push([
    Markup.button.callback('⬅️ Назад', NavCallback.create('back')),
    Markup.button.callback('🏠 Главное меню', NavCallback.create('main_menu')),
  ]);
  
  return Markup.inlineKeyboard(buttons);
}

/**
 * Клавиатура при отсутствии городов
 */
export function getNoCitiesKeyboard(userId: number) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('➕ Добавить город', SettingsCallback.create('cities', 'add', '0')),
      Markup.button.callback('⚙️ Настройки', SettingsCallback.create('main', 'show')),
    ],
    [
      Markup.button.callback('⬅️ Главное меню', NavCallback.create('main_menu')),
    ],
  ]);
}

/**
 * Клавиатура для сообщений об ошибках
 */
export function getErrorKeyboard(
  userId: number,
  showRetry: boolean = false,
  retryCallback?: string
) {
  const buttons: any[] = [];
  
  if (showRetry && retryCallback) {
    buttons.push([
      Markup.button.callback('🔄 Повторить', retryCallback),
    ]);
  }
  
  buttons.push([
    Markup.button.callback('⬅️ Главное меню', NavCallback.create('main_menu')),
  ]);
  
  return Markup.inlineKeyboard(buttons);
}

