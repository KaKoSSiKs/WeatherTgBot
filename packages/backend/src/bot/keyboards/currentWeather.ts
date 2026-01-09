/**
 * Current Weather Keyboards
 * 
 * Клавиатуры для сценария "Текущая погода".
 */

import { Markup } from 'telegraf';
import { WeatherCallback, ForecastCallback, NotificationCallback, SettingsCallback } from './callback_data';
import { addNavigationButtons } from './navigation';

/**
 * Клавиатура для сообщения с текущей погодой
 */
export function getCurrentWeatherKeyboard(
  locationId: number,
  userId: number,
  fromMenu: boolean = true
): ReturnType<typeof Markup.inlineKeyboard> {
  const keyboard = [
    [
      Markup.button.callback('📍 Сменить город', WeatherCallback.create('change_city', locationId, 'weather')),
      Markup.button.callback('🔄 Обновить', WeatherCallback.create('refresh', locationId, 'weather'))
    ],
    [
      Markup.button.callback('📅 Прогноз на день', ForecastCallback.create('day', locationId, 'today', 'weather')),
      Markup.button.callback('📅 На 3 дня', ForecastCallback.create('3day', locationId, 'today', 'weather'))
    ],
    [
      Markup.button.callback('📅 На 7 дней', ForecastCallback.create('7day', locationId, 'today', 'weather')),
      Markup.button.callback('📅 На 10 дней', ForecastCallback.create('10day', locationId, 'today', 'weather'))
    ],
    [
      Markup.button.callback('🔔 Уведомить', NotificationCallback.create('add', 0, 'weather'))
    ]
  ];

  return Markup.inlineKeyboard(addNavigationButtons(keyboard, 0));
}

/**
 * Клавиатура для выбора города
 */
export function getCitySelectionKeyboard(
  locations: Array<{ id: number; name: string }>,
  returnTo: string = 'weather'
): ReturnType<typeof Markup.inlineKeyboard> {
  const keyboard: any[][] = [];
  
  // Добавляем кнопки для каждого города
  for (const loc of locations) {
    keyboard.push([
      Markup.button.callback(
        `📍 ${loc.name}`,
        returnTo === 'settings' 
          ? SettingsCallback.create('cities', 'select', loc.id)
          : WeatherCallback.create('select_city', loc.id, returnTo)
      )
    ]);
  }
  
  // Кнопка добавления города
  keyboard.push([
    Markup.button.callback('➕ Добавить город', SettingsCallback.create('cities', 'add', '0'))
  ]);
  
  return Markup.inlineKeyboard(addNavigationButtons(keyboard, 0));
}

/**
 * Клавиатура при отсутствии городов
 */
export function getNoCitiesKeyboard(returnTo: string = 'weather'): ReturnType<typeof Markup.inlineKeyboard> {
  const keyboard = [
    [
      Markup.button.callback('➕ Добавить город', SettingsCallback.create('cities', 'add', '0')),
      Markup.button.callback('⚙️ Настройки', SettingsCallback.create('main', 'show'))
    ]
  ];

  return Markup.inlineKeyboard(addNavigationButtons(keyboard, 0));
}

/**
 * Клавиатура для сообщений об ошибках
 */
export function getErrorKeyboard(
  userId: number,
  showRetry: boolean = false,
  retryCallback?: string
): ReturnType<typeof Markup.inlineKeyboard> {
  const keyboard: any[][] = [];
  
  // Кнопка "Повторить" (если нужно)
  if (showRetry && retryCallback) {
    keyboard.push([
      Markup.button.callback('🔄 Повторить', retryCallback)
    ]);
  }
  
  return Markup.inlineKeyboard(addNavigationButtons(keyboard, 0));
}

