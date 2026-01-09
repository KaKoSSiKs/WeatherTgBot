/**
 * Main Menu Keyboard
 * 
 * Главное меню бота с InlineKeyboard.
 */

import { Markup } from 'telegraf';
import { MenuCallback, ForecastCallback, NotificationCallback } from './callback_data';

/**
 * Создает главное меню с InlineKeyboard
 */
export function mainMenuKeyboard(): ReturnType<typeof Markup.inlineKeyboard> {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('🌤️ Текущая погода', MenuCallback.create('current_weather')),
      Markup.button.callback('📅 Прогноз на день', ForecastCallback.create('day', undefined, undefined, 'main_menu'))
    ],
    [
      Markup.button.callback('📅 На 3 дня', ForecastCallback.create('3day', undefined, undefined, 'main_menu')),
      Markup.button.callback('📅 На 7 дней', ForecastCallback.create('7day', undefined, undefined, 'main_menu')),
      Markup.button.callback('📅 На 10 дней', ForecastCallback.create('10day', undefined, undefined, 'main_menu'))
    ],
    [
      Markup.button.callback('🔔 Уведомления', NotificationCallback.create('main')),
      Markup.button.callback('⚙️ Настройки', MenuCallback.create('settings'))
    ],
    [
      Markup.button.callback('❓ Помощь', MenuCallback.create('help'))
    ]
  ]);
}

/**
 * Текст приветствия для главного меню
 */
export const MAIN_MENU_TEXT = `👋 Привет! Я ваш персональный погодный помощник!

Я могу:
• Показать текущую погоду 🌤️
• Дать прогноз на день 📅
• Показать прогноз на 3, 7, 10 дней с детализацией
• Настроить автоматические уведомления
• Давать рекомендации по одежде

Выберите действие:`;

