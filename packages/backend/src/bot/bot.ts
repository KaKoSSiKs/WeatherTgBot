/**
 * Telegram Bot
 * 
 * Инициализация и настройка Telegraf бота.
 */

import { Telegraf } from 'telegraf';
import type { WeatherService } from '../services/weather';
import type { NotificationService } from '../services/notification/notification.service';
import { handleStartCommand } from './commands/start.command';
import { handleWeatherCommand } from './commands/weather.command';
import { handleForecastCommand } from './commands/forecast.command';
import { handleHelpCommand } from './commands/help.command';
import { handleAddCommand } from './commands/add.command';
import { handleListCommand } from './commands/list.command';
import { handleUnknownCommand, handleUnknownMessage } from './handlers/unknown.handler';
import { errorHandlerMiddleware } from './handlers/error.handler';
import { handleMenuCallback, handleNavCallback } from './handlers/menu.handler';
import { handleWeatherCallback } from './handlers/weather.handler';
import { handleForecastCallback } from './handlers/forecast.handler';
import { handleNotificationCallback } from './handlers/notification.handler';
import { handleNotifCreateCallback, handleNotifCreateText } from './handlers/notif-create.handler';
import { handleSettingsCallback, handleCityInput, handleLocation } from './handlers/settings.handler';
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
  bot.command('help', handleHelpCommand);
  bot.command('add', handleAddCommand);
  bot.command('list', handleListCommand);
  
  // Обработка callback queries
  bot.action(/^menu:/, (ctx) => handleMenuCallback(ctx, weatherService, notificationService));
  bot.action(/^nav:/, (ctx) => handleNavCallback(ctx, notificationService));
  bot.action(/^weather:/, (ctx) => handleWeatherCallback(ctx, weatherService));
  bot.action(/^forecast:/, (ctx) => handleForecastCallback(ctx, weatherService));
  bot.action(/^notification:/, (ctx) => handleNotificationCallback(ctx, notificationService));
  bot.action(/^notif_create:/, (ctx) => handleNotifCreateCallback(ctx, notificationService));
  bot.action(/^settings:/, handleSettingsCallback);
  
  // Обработка текстовых сообщений
  bot.on('text', async (ctx) => {
    const text = ctx.message.text;
    
    // Проверяем, не в процессе ли создания уведомления
    const handled = await handleNotifCreateText(ctx, notificationService);
    if (handled) {
      return;
    }
    
    // Проверяем, не добавление ли города
    if (!text.startsWith('/')) {
      const cityHandled = await handleCityInput(ctx, text);
      if (cityHandled) {
        return;
      }
    }
    
    // Если текст начинается с /, это неизвестная команда
    if (text.startsWith('/')) {
      await handleUnknownCommand(ctx);
    } else {
      await handleUnknownMessage(ctx);
    }
  });
  
  // Обработка геолокации
  bot.on('location', async (ctx) => {
    if (ctx.message.location) {
      await handleLocation(ctx, ctx.message.location.latitude, ctx.message.location.longitude);
    }
  });
  
  // Обработка ошибок Telegraf
  bot.catch((err, ctx) => {
    logger.error('Telegraf error:', err);
    ctx.reply('❌ Произошла ошибка. Попробуйте позже.').catch(() => {
      // Игнорируем ошибки отправки
    });
  });
  
  return bot;
}

