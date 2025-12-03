/**
 * Клавиатуры для сценария "Текущая погода"
 */

import { InlineKeyboard } from 'grammy';
import { WeatherCallback, ForecastCallback, NotificationCallback, SettingsCallback, NavCallback } from './callback_data';
import { addNavigationButtons } from './navigation';

/**
 * Клавиатура для сообщения с текущей погодой
 */
export function getCurrentWeatherKeyboard(
  locationId: number,
  userId: number,
  fromMenu: boolean = true
): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  
  // Строка 1: Основные действия
  keyboard
    .text('📍 Сменить город', WeatherCallback.create('change_city', locationId, 'weather'))
    .text('🔄 Обновить', WeatherCallback.create('refresh', locationId, 'weather'))
    .row();
  
  // Строка 2: Прогноз на день и 3 дня
  keyboard
    .text('📅 Прогноз на день', ForecastCallback.create('day', locationId, 'today', 'weather'))
    .text('📅 На 3 дня', ForecastCallback.create('3day', locationId, 'today', 'weather'))
    .row();
  
  // Строка 3: Прогноз на 7 и 10 дней
  keyboard
    .text('📅 На 7 дней', ForecastCallback.create('7day', locationId, 'today', 'weather'))
    .text('📅 На 10 дней', ForecastCallback.create('10day', locationId, 'today', 'weather'))
    .row();
  
  // Строка 4: Уведомление
  keyboard
    .text('🔔 Уведомить', NotificationCallback.create('add', 0, 'weather'))
    .row();
  
  // Навигационные кнопки
  addNavigationButtons(keyboard, userId);
  
  return keyboard;
}

/**
 * Клавиатура для выбора города
 */
export function getCitySelectionKeyboard(
  locations: Array<{ id: number; name: string }>,
  userId: number,
  returnTo: string = 'weather'
): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  
  // Добавляем кнопки для каждого города
  const locationButtons: Array<{ text: string; callbackData: string }> = [];
  
  for (const location of locations) {
    locationButtons.push({
      text: `📍 ${location.name}`,
      callbackData: WeatherCallback.create('select_city', location.id, returnTo)
    });
  }
  
  // Разбиваем на строки по 2 кнопки
  for (let i = 0; i < locationButtons.length; i += 2) {
    if (i + 1 < locationButtons.length) {
      keyboard
        .text(locationButtons[i].text, locationButtons[i].callbackData)
        .text(locationButtons[i + 1].text, locationButtons[i + 1].callbackData)
        .row();
    } else {
      keyboard
        .text(locationButtons[i].text, locationButtons[i].callbackData)
        .row();
    }
  }
  
  // Кнопка добавления города
  keyboard
    .text('➕ Добавить город', SettingsCallback.create('cities', 'add', '0'))
    .row();
  
  // Навигационные кнопки
  addNavigationButtons(keyboard, userId);
  
  return keyboard;
}

/**
 * Клавиатура при отсутствии городов
 */
export function getNoCitiesKeyboard(userId: number): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  
  keyboard
    .text('➕ Добавить город', SettingsCallback.create('cities', 'add', '0'))
    .text('⚙️ Настройки', SettingsCallback.create('main', 'show'))
    .row();
  
  // Навигационные кнопки
  addNavigationButtons(keyboard, userId);
  
  return keyboard;
}

/**
 * Клавиатура для сообщений об ошибках
 */
export function getErrorKeyboard(
  userId: number,
  showRetry: boolean = false,
  retryCallback?: string
): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  
  // Кнопка "Повторить" (если нужно)
  if (showRetry && retryCallback) {
    keyboard
      .text('🔄 Повторить', retryCallback)
      .row();
  }
  
  // Навигационные кнопки
  addNavigationButtons(keyboard, userId);
  
  return keyboard;
}

