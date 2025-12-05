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
import { connectPrisma, disconnectPrisma } from './db/prisma';

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
  registerWelcomeCommand(bot, weatherProvider);
  registerAddCommand(bot);
  registerListCommand(bot);
  registerWeatherCommand(bot, weatherProvider);
  registerSetupDialog(bot);
  
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
  await disconnectPrisma();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger('Received SIGTERM, shutting down gracefully...');
  await disconnectPrisma();
  process.exit(0);
});