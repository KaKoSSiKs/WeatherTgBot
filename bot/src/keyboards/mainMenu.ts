import { InlineKeyboard } from 'grammy';
import { MenuCallback, ForecastCallback, NotificationCallback } from './callback_data';

/**
 * Создает главное меню с InlineKeyboard
 * Формат согласно новому дизайну UX/UI:
 * - Строка 1: Текущая погода, Прогноз на день
 * - Строка 2: На 3 дня, На 7 дней, На 10 дней
 * - Строка 3: Уведомления, Настройки
 * - Строка 4: Помощь
 */
export function mainMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    // Строка 1: Текущая погода и прогноз на день
    .text('🌤️ Текущая погода', MenuCallback.create('current_weather'))
    .text('📅 Прогноз на день', ForecastCallback.create('day', undefined, undefined, 'main_menu'))
    .row()
    // Строка 2: Прогнозы на несколько дней
    .text('📅 На 3 дня', ForecastCallback.create('3day', undefined, undefined, 'main_menu'))
    .text('📅 На 7 дней', ForecastCallback.create('7day', undefined, undefined, 'main_menu'))
    .text('📅 На 10 дней', ForecastCallback.create('10day', undefined, undefined, 'main_menu'))
    .row()
    // Строка 3: Уведомления и настройки
    .text('🔔 Уведомления', NotificationCallback.create('main'))
    .text('⚙️ Настройки', MenuCallback.create('settings'))
    .row()
    // Строка 4: Помощь
    .text('❓ Помощь', MenuCallback.create('help'));
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

