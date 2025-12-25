import { createBot } from './bot';
import {
  registerAddCommand,
  registerListCommand,
  registerWeatherCommand,
  registerWelcomeCommand
} from './commands';
import { appConfig } from './config';
import { logger } from './utils/logger';
import { getWeatherProvider } from './weather/provider';
import { registerSetupDialog } from './dialogs/setup';
import { registerCurrentWeatherHandlers } from './handlers/currentWeather';
import { registerForecastHandlers } from './handlers/forecast';
import { registerSettingsHandlers } from './handlers/settings';
import { registerNotificationHandlers } from './handlers/notifications';
import { getNotificationService } from './services/notificationService';
import { connectPrisma, disconnectPrisma } from './db/prisma';
import axios from 'axios';

async function main() {
  logger('Bot starting...');
  
  // Подключаемся к базе данных
  try {
    await connectPrisma();
  } catch (error) {
    logger('Failed to connect to database. Please check your DATABASE_URL in .env file');
    logger('Error:', error);
    process.exit(1);
  }
  
  // Проверяем API ключ OpenWeatherMap (опционально, не блокируем запуск)
  if (appConfig.WEATHER_API_PROVIDER === 'openweathermap' && appConfig.WEATHER_API_KEY) {
    try {
      logger('Validating OpenWeatherMap API key (API 2.5)...');
      // Используем HTTP для бесплатной подписки
      const testResponse = await axios.get('http://api.openweathermap.org/data/2.5/weather', {
        params: {
          lat: 55.7558, // Москва
          lon: 37.6173,
          appid: appConfig.WEATHER_API_KEY,
          units: 'metric'
        },
        timeout: 5000
      });
      
      if (testResponse.status === 200) {
        logger('✓ OpenWeatherMap API key is valid');
      }
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        logger('⚠️ WARNING: OpenWeatherMap API key is invalid or expired!');
        logger('⚠️ Possible reasons:');
        logger('   1. Invalid or incorrect API key');
        logger('   2. API key not activated yet (can take up to 2 hours after creation)');
        logger('   3. API key blocked due to exceeding rate limits');
        logger('⚠️ Please check:');
        logger('   1. Your API key at: https://home.openweathermap.org/api_keys');
        logger('   2. Make sure you are using the correct endpoint: api.openweathermap.org');
        logger('   3. Wait up to 2 hours if you just created the key');
        logger('⚠️ Bot will start, but weather features will not work until API key is fixed');
      } else if (axios.isAxiosError(error) && error.response?.status === 429) {
        logger('⚠️ WARNING: API rate limit exceeded!');
        logger('⚠️ Please wait 10 minutes before making more requests');
      } else {
        logger('⚠️ Could not validate API key (network error), but continuing...');
      }
    }
  }
  
  const bot = createBot();
  const weatherProvider = getWeatherProvider();
  
  // ✅ ДОБАВИТЬ ГЛОБАЛЬНЫЙ ОБРАБОТЧИК ОШИБОК
  bot.catch((err) => {
    const ctx = err.ctx;
    logger(`Error while handling update ${ctx.update.update_id}:`, err.error);
    
    // Игнорируем ошибки "протухших" callback'ов
    if (err.error && typeof err.error === 'object' && 'description' in err.error && 
        typeof err.error.description === 'string' && err.error.description.includes('query is too old')) {
      return;
    }
    
    // Для других ошибок можно отправить сообщение пользователю
    ctx.reply('Произошла непредвиденная ошибка. Попробуйте еще раз.').catch(() => {});
  });
  
  // Регистрируем обработчики текущей погоды ПЕРЕД welcome, чтобы они перехватывали callback'и
  registerCurrentWeatherHandlers(bot);
  // Регистрируем обработчики прогнозов
  registerForecastHandlers(bot);
  // Регистрируем обработчики настроек
  registerSettingsHandlers(bot);
  // Регистрируем обработчики уведомлений
  registerNotificationHandlers(bot);
  registerWelcomeCommand(bot, weatherProvider);
  registerAddCommand(bot);
  registerListCommand(bot);
  registerWeatherCommand(bot, weatherProvider);
  registerSetupDialog(bot);
  
  // Инициализируем и запускаем сервис уведомлений
  const notificationService = getNotificationService(bot, appConfig.TZ);
  notificationService.startScheduler();
  logger('Notification scheduler started');
  
  await bot.api.getMe();
  logger('Bot is ready and running');
  bot.start();
}  

main().catch(async (err) => {
  logger('Fatal error:', err);
  console.error(err);
  await disconnectPrisma();
  process.exit(1);
});

// Обработка завершения процесса
process.on('SIGINT', async () => {
  logger('Received SIGINT, shutting down gracefully...');
  try {
    const notificationService = getNotificationService();
    notificationService.stopScheduler();
  } catch (e) {
    // Сервис может быть не инициализирован
  }
  await disconnectPrisma();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger('Received SIGTERM, shutting down gracefully...');
  try {
    const notificationService = getNotificationService();
    notificationService.stopScheduler();
  } catch (e) {
    // Сервис может быть не инициализирован
  }
  await disconnectPrisma();
  process.exit(0);
});