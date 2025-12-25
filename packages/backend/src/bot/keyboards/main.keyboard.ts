/**
 * Main Menu Keyboard
 * 
 * Главное меню бота с основными действиями.
 */

import { Markup } from 'telegraf';

/**
 * Главное меню
 */
export function mainMenuKeyboard(): ReturnType<typeof Markup.inlineKeyboard> {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('🌤️ Текущая погода', 'menu:current_weather'),
      Markup.button.callback('📅 Прогноз на день', 'forecast:day'),
    ],
    [
      Markup.button.callback('📅 На 3 дня', 'forecast:3day'),
      Markup.button.callback('📅 На 7 дней', 'forecast:7day'),
      Markup.button.callback('📅 На 10 дней', 'forecast:10day'),
    ],
    [
      Markup.button.callback('🔔 Уведомления', 'notification:main'),
      Markup.button.callback('⚙️ Настройки', 'settings:main'),
    ],
    [
      Markup.button.callback('❓ Помощь', 'menu:help'),
    ],
  ]);
}

/**
 * Текст главного меню
 */
export const MAIN_MENU_TEXT = `👋 Привет! Я ваш персональный погодный помощник!

Я могу:
• Показать текущую погоду 🌤️
• Дать прогноз на день 📅
• Показать прогноз на 3, 7, 10 дней с детализацией
• Настроить автоматические уведомления
• Давать рекомендации по одежде

Выберите действие:`;

