/**
 * Telegram Bot
 * 
 * Инициализация и настройка Telegraf бота.
 */

import { Telegraf } from 'telegraf';
import type { WeatherService } from '../services/weather';
import type { NotificationService } from '../services/notification';
import { handleStartCommand } from './commands/start.command';
import { handleWeatherCommand } from './commands/weather.command';
import { handleForecastCommand } from './commands/forecast.command';
import { handleAddCommand } from './commands/add.command';
import { handleListCommand } from './commands/list.command';
import { handleHelpCommand } from './commands/help.command';
import { handleUnknownCommand, handleUnknownMessage } from './handlers/unknown.handler';
import { errorHandlerMiddleware } from './handlers/error.handler';
import { registerCurrentWeatherHandlers, showCurrentWeather } from './handlers/currentWeather.handler';
import { registerForecastHandlers } from './handlers/forecast.handler';
import { registerSettingsHandlers, showSettingsMain } from './handlers/settings.handler';
import { registerNotificationHandlers, showNotificationMain } from './handlers/notifications.handler';
import { MenuCallback, NavCallback } from './keyboards';
import { mainMenuKeyboard, MAIN_MENU_TEXT } from './keyboards';
import { logger } from '../shared/utils/logger';

/**
 * Создать и настроить бота
 */
export function createBot(
  botToken: string,
  weatherService: WeatherService,
  notificationService: NotificationService
): Telegraf {
  const bot = new Telegraf(botToken);
  
  // Middleware для обработки ошибок
  bot.use(errorHandlerMiddleware);
  
  // Команды
  bot.command('start', handleStartCommand);
  bot.command('weather', (ctx) => handleWeatherCommand(ctx, weatherService));
  bot.command('forecast', (ctx) => handleForecastCommand(ctx, weatherService));
  bot.command('add', (ctx) => handleAddCommand(ctx, notificationService, weatherService));
  bot.command('list', (ctx) => handleListCommand(ctx, notificationService));
  bot.command('help', handleHelpCommand);
  
  // Регистрируем handlers для текущей погоды (ПЕРЕД общими обработчиками)
  registerCurrentWeatherHandlers(bot, weatherService);
  
  // Регистрируем handlers для прогнозов
  registerForecastHandlers(bot, weatherService);
  
  // Регистрируем handlers для настроек
  registerSettingsHandlers(bot);
  
  // Регистрируем handlers для уведомлений
  registerNotificationHandlers(bot, notificationService);
  
  // Обработка callback query для главного меню
  // ВАЖНО: Этот обработчик должен быть ПОСЛЕ registerNotificationHandlers и registerSettingsHandlers
  // чтобы не перехватывать их callback queries
  bot.action(/^menu:/, async (ctx) => {
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
      case 'current_weather':
        // Обработается в registerCurrentWeatherHandlers через action /^menu:current_weather$/
        // Не вызываем здесь, чтобы избежать дублирования
        break;
      case 'help':
        try {
          const helpMessage = 
            `📋 *Доступные команды:*\n\n` +
            `/start - Начать работу с ботом и зарегистрироваться.\n` +
            `/weather - Получить текущую погоду для вашей основной локации.\n` +
            `/forecast - Получить прогноз погоды на 5 дней.\n` +
            `/add - Начать процесс создания нового уведомления о погоде.\n` +
            `/list - Показать список всех ваших активных уведомлений.\n` +
            `/help - Показать эту справку.\n\n` +
            `Для управления локациями и другими настройками используйте меню "⚙️ Настройки".`;
          await ctx.editMessageText(helpMessage, {
            parse_mode: 'Markdown',
            reply_markup: mainMenuKeyboard().reply_markup
          });
        } catch {
          await handleHelpCommand(ctx);
        }
        break;
      case 'main':
      default:
        try {
          await ctx.editMessageText(MAIN_MENU_TEXT, mainMenuKeyboard());
        } catch {
          await ctx.reply(MAIN_MENU_TEXT, mainMenuKeyboard());
        }
        break;
    }
  });
  
  // Обработка навигации
  bot.action(/^nav:/, async (ctx) => {
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
      case 'main_menu':
        try {
          await ctx.editMessageText(MAIN_MENU_TEXT, mainMenuKeyboard());
        } catch {
          await ctx.reply(MAIN_MENU_TEXT, mainMenuKeyboard());
        }
        break;
      case 'back':
        // TODO: Реализовать навигацию назад
        break;
    }
  });
  
  // Обработка неизвестных команд (только команды, начинающиеся с /)
  bot.hears(/^\//, async (ctx) => {
    const text = ctx.message.text;
    await handleUnknownCommand(ctx);
  });
  
  // Обработка неизвестных сообщений (не команды)
  // Обрабатывается в registerSettingsHandlers для добавления городов
  
  // Обработка ошибок Telegraf
  bot.catch((err, ctx) => {
    logger.error('Telegraf error:', err);
    ctx.reply('❌ Произошла ошибка. Попробуйте позже.').catch(() => {
      // Игнорируем ошибки отправки
    });
  });
  
  return bot;
}

