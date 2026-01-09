/**
 * Telegram Bot Entry Point
 * 
 * Точка входа для запуска Telegram бота.
 */

import { createBot } from './bot';
import { WeatherService } from '../services/weather';
import { OpenWeatherProvider } from '../integrations/weather';
import { NotificationService } from '../services/notification/notification.service';
import { NotificationRepository } from '../storage/prisma/repositories/notification.repository';
import { UserSettingsRepository } from '../storage/prisma/repositories/user-settings.repository';
import { LocationRepository } from '../storage/prisma/repositories/location.repository';
import { appConfig } from '../config';
import { connectPrisma, disconnectPrisma } from '../storage/prisma/client';
import { logger } from '../shared/utils/logger';

/**
 * Запустить бота
 */
export async function startBot(): Promise<void> {
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
    
    // Инициализируем NotificationService
    const notificationRepo = new NotificationRepository();
    const settingsRepo = new UserSettingsRepository();
    const locationRepo = new LocationRepository();
    const notificationService = new NotificationService(
      notificationRepo,
      settingsRepo,
      locationRepo,
      weatherService,
      appConfig.TZ
    );
    
    // Создаем бота
    const bot = createBot(appConfig.BOT_TOKEN, weatherService, notificationService);
    
    // Устанавливаем бота в NotificationService и запускаем планировщик
    notificationService.setBot(bot);
    notificationService.startScheduler();
    logger.info('Notification scheduler started');
    
    // Запускаем бота
    await bot.launch();
    logger.info('Bot started successfully');
    
    // Graceful shutdown
    process.once('SIGINT', () => {
      logger.info('SIGINT received, shutting down...');
      notificationService.stopScheduler();
      bot.stop('SIGINT');
      disconnectPrisma().then(() => {
        process.exit(0);
      });
    });
    
    process.once('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down...');
      notificationService.stopScheduler();
      bot.stop('SIGTERM');
      disconnectPrisma().then(() => {
        process.exit(0);
      });
    });
    
  } catch (error) {
    logger.error('Failed to start bot:', error);
    await disconnectPrisma();
    process.exit(1);
  }
}

