/**
 * Menu Handler
 * 
 * Обработчик callback'ов главного меню.
 */

import type { Context } from 'telegraf';
import type { WeatherService } from '../../services/weather';
import type { NotificationService } from '../../services/notification/notification.service';
import { MenuCallback, NavCallback } from '../keyboards/callback_data';
import { mainMenuKeyboard, MAIN_MENU_TEXT } from '../keyboards';
import { notificationMainKeyboard } from '../keyboards/notifications';
import { resetToMainMenu, pushNavigationState, popNavigationState, getPreviousNavigationState } from '../../shared/utils/navigation';
import { formatCurrentWeather } from '../formatters/weather.formatter';
import { handleError } from './error.handler';
import { LocationNotSetError } from '../../shared/errors/domain.errors';
import { logger } from '../../shared/utils/logger';

/**
 * Обработчик callback'ов главного меню
 */
export async function handleMenuCallback(
  ctx: Context,
  weatherService: WeatherService,
  notificationService: NotificationService
): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  try {
    await ctx.answerCbQuery();
  } catch (error: any) {
    if (error.description?.includes('query is too old')) {
      return;
    }
  }

  const data = ctx.callbackQuery && 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : '';
  const parsed = MenuCallback.parse(data);
  
  if (!parsed) {
    await ctx.reply('Неизвестная команда. Попробуйте ещё раз.');
    return;
  }

  switch (parsed.action) {
    case 'settings': {
      const telegramId = userId.toString();
      const { UserRepository } = await import('../../storage/prisma/repositories');
      const userRepo = new UserRepository();
      const user = await userRepo.findByTelegramId(telegramId);
      
      if (!user) {
        await ctx.reply('❌ Пользователь не найден. Используйте /start для регистрации.');
        return;
      }
      
      const { UserSettingsRepository } = await import('../../storage/prisma/repositories/user-settings.repository');
      const settingsRepo = new UserSettingsRepository();
      const settings = await settingsRepo.findByUserId(user.id);
      const { LocationRepository } = await import('../../storage/prisma/repositories/location.repository');
      const locationRepo = new LocationRepository();
      const locations = await locationRepo.findByUserId(user.id);
      
      const text = `⚙️ Настройки\n\n` +
        `📍 Локации: ${locations.length}\n` +
        `🌡️ Единицы: ${settings?.temperatureUnit === 'FAHRENHEIT' ? 'Фаренгейт' : 'Цельсий'}\n` +
        `🌐 Язык: ${settings?.language || 'ru'}\n\n` +
        `Выберите раздел:`;
      
      const keyboard = {
        inline_keyboard: [
          [
            { text: '📍 Мои города', callback_data: 'settings:cities:list' }
          ],
          [
            { text: '🌡️ Единицы измерения', callback_data: 'settings:units:show' }
          ],
          [
            { text: '🏠 Главное меню', callback_data: 'nav:main_menu' }
          ]
        ]
      };
      
      const result = await ctx.editMessageText(text, keyboard);
      if (result && typeof result === 'object' && 'message_id' in result) {
        pushNavigationState(userId, 'settings_main', {}, result.message_id);
      }
      break;
    }
    case 'notifications': {
      const telegramId = userId.toString();
      const { UserRepository } = await import('../../storage/prisma/repositories');
      const userRepo = new UserRepository();
      const user = await userRepo.findByTelegramId(telegramId);
      
      if (!user) {
        await ctx.reply('❌ Пользователь не найден. Используйте /start для регистрации.');
        return;
      }
      
      const notifications = await notificationService.getUserNotifications(user.id);
      const activeCount = notifications.filter(n => n.enabled).length;
      const pausedCount = notifications.filter(n => !n.enabled).length;
      const totalCount = notifications.length;
      
      const text = `🔔 Уведомления о погоде\n\nНастройте автоматические уведомления о погоде и погодных событиях.\n\n📊 Статистика:\n✅ Активных: ${activeCount}\n⏸️ Приостановленных: ${pausedCount}\n📌 Всего: ${totalCount}\n\nВыберите действие:`;
      
      const result = await ctx.editMessageText(text, notificationMainKeyboard());
      if (result && typeof result === 'object' && 'message_id' in result) {
        pushNavigationState(userId, 'notifications_main', {}, result.message_id);
      }
      break;
    }
    case 'help': {
      const helpText = `❓ Помощь

Я могу помочь вам с:
• Текущей погодой в вашем городе
• Прогнозами на день, 3, 7 и 10 дней
• Настройкой автоматических уведомлений
• Рекомендациями по одежде

Используйте кнопки меню для навигации.`;
      
      await ctx.editMessageText(helpText);
      pushNavigationState(userId, 'help', {}, ctx.callbackQuery && 'message' in ctx.callbackQuery && ctx.callbackQuery.message && 'message_id' in ctx.callbackQuery.message ? ctx.callbackQuery.message.message_id : undefined);
      break;
    }
    case 'current_weather': {
      const telegramId = userId.toString();
      
      try {
        // Показываем индикатор печати
        await ctx.sendChatAction('typing');
        
        // Получаем погоду через WeatherService
        const result = await weatherService.getCurrentWeatherForUser(telegramId);
        
        // Форматируем ответ
        const message = formatCurrentWeather(result);
        
        await ctx.reply(message);
        
        logger.debug(`Weather sent to user ${telegramId} from menu`);
      } catch (error) {
        const errorMessage = handleError(ctx, error);
        // handleError уже отправляет сообщение с клавиатурой для LocationNotSetError
        if (errorMessage) {
          await ctx.reply(errorMessage);
        }
      }
      break;
    }
    default:
      await ctx.reply('Неизвестная команда. Попробуйте ещё раз.');
  }
}

/**
 * Обработчик навигационных callback'ов
 */
export async function handleNavCallback(
  ctx: Context,
  notificationService: NotificationService
): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  try {
    await ctx.answerCbQuery();
  } catch (error: any) {
    if (error.description?.includes('query is too old')) {
      return;
    }
  }

  const data = ctx.callbackQuery && 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : '';
  const parsed = NavCallback.parse(data);
  
  if (!parsed) {
    return;
  }

  switch (parsed.action) {
    case 'back': {
      const prevState = popNavigationState(userId);
      if (prevState) {
        // Восстанавливаем предыдущий экран
        if (prevState.screen === 'main_menu') {
          const result = await ctx.editMessageText(MAIN_MENU_TEXT, mainMenuKeyboard());
          if (result && typeof result === 'object' && 'message_id' in result) {
            pushNavigationState(userId, 'main_menu', {}, result.message_id);
          }
        } else if (prevState.screen === 'notifications_main') {
          const telegramId = userId.toString();
          const { UserRepository } = await import('../../storage/prisma/repositories');
          const userRepo = new UserRepository();
          const user = await userRepo.findByTelegramId(telegramId);
          
          if (user) {
            const notifications = await notificationService.getUserNotifications(user.id);
            const activeCount = notifications.filter(n => n.enabled).length;
            const pausedCount = notifications.filter(n => !n.enabled).length;
            const totalCount = notifications.length;
            
            const text = `🔔 Уведомления о погоде\n\nНастройте автоматические уведомления о погоде и погодных событиях.\n\n📊 Статистика:\n✅ Активных: ${activeCount}\n⏸️ Приостановленных: ${pausedCount}\n📌 Всего: ${totalCount}\n\nВыберите действие:`;
            
            const result = await ctx.editMessageText(text, notificationMainKeyboard());
            if (result && typeof result === 'object' && 'message_id' in result) {
              pushNavigationState(userId, 'notifications_main', {}, result.message_id);
            }
          }
        } else {
          // Для других экранов просто возвращаемся в главное меню
          const result = await ctx.editMessageText(MAIN_MENU_TEXT, mainMenuKeyboard());
          if (result && typeof result === 'object' && 'message_id' in result) {
            pushNavigationState(userId, 'main_menu', {}, result.message_id);
          }
        }
      } else {
        // Если нет истории, возвращаемся в главное меню
        const result = await ctx.editMessageText(MAIN_MENU_TEXT, mainMenuKeyboard());
        if (result && typeof result === 'object' && 'message_id' in result) {
          pushNavigationState(userId, 'main_menu', {}, result.message_id);
        }
      }
      break;
    }
    case 'main_menu': {
      resetToMainMenu(userId);
      const result = await ctx.editMessageText(MAIN_MENU_TEXT, mainMenuKeyboard());
      if (result && typeof result === 'object' && 'message_id' in result) {
        pushNavigationState(userId, 'main_menu', {}, result.message_id);
      }
      break;
    }
    case 'cancel': {
      resetToMainMenu(userId);
      const result = await ctx.editMessageText(MAIN_MENU_TEXT, mainMenuKeyboard());
      if (result && typeof result === 'object' && 'message_id' in result) {
        pushNavigationState(userId, 'main_menu', {}, result.message_id);
      }
      break;
    }
  }
}

