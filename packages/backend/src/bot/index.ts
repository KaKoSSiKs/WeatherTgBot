/**
 * Telegram Bot Entry Point
 * 
 * Точка входа для запуска Telegram бота.
 */

import { createBot } from './bot';
import { WeatherService } from '../services/weather';
import { NotificationService } from '../services/notification';
import { OpenWeatherProvider } from '../integrations/weather';
import { appConfig } from '../config';
import { connectPrisma, disconnectPrisma } from '../storage/prisma/client';
import { logger } from '../shared/utils/logger';
import { startNotificationScheduler } from './scheduler/notification.scheduler';

/**
 * Запустить бота
 */
export async function startBot(): Promise<void> {
  let scheduler: { stop: () => void } | null = null;
  
  try {
    // Подключаемся к БД
    await connectPrisma();
    logger.info('Database connected');
    
    // Создаем WeatherProvider
    const apiKey = appConfig.WEATHER_API_KEY || appConfig.OPENWEATHER_API_KEY || '';
    if (!apiKey) {
      throw new Error('WEATHER_API_KEY is required');
    }
    
    const weatherProvider = new OpenWeatherProvider(apiKey);
    
    // Создаем WeatherService
    const weatherService = new WeatherService(weatherProvider);
    
    // Создаем NotificationService
    const notificationService = new NotificationService(
      undefined, // notificationRepo (создастся автоматически)
      undefined, // userRepo (создастся автоматически)
      weatherService
    );
    
    // Создаем бота
    const bot = createBot(appConfig.BOT_TOKEN, weatherService, notificationService);
    
    // Запускаем планировщик уведомлений
    scheduler = startNotificationScheduler(bot, notificationService);
    
    // Запускаем бота
    await bot.launch();
    logger.info('Bot started successfully');
    
    // Graceful shutdown
    process.once('SIGINT', () => {
      logger.info('SIGINT received, shutting down...');
      if (scheduler) {
        scheduler.stop();
      }
      bot.stop('SIGINT');
      disconnectPrisma().then(() => {
        process.exit(0);
      });
    });
    
    process.once('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down...');
      if (scheduler) {
        scheduler.stop();
      }
      bot.stop('SIGTERM');
      disconnectPrisma().then(() => {
        process.exit(0);
      });
    });
    
  } catch (error) {
    logger.error('Failed to start bot:', error);
    if (scheduler) {
      scheduler.stop();
    }
    await disconnectPrisma();
    process.exit(1);
  }
}

