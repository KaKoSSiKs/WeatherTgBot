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

async function main() {
  logger('Bot starting...');
  logger('Bot Token:', appConfig.BOT_TOKEN);
  
  const bot = createBot();
  const weatherProvider = getWeatherProvider();
  
  // ✅ ДОБАВИТЬ ГЛОБАЛЬНЫЙ ОБРАБОТЧИК ОШИБОК
  bot.catch((err) => {
    const ctx = err.ctx;
    logger(`Error while handling update ${ctx.update.update_id}:`, err.error);
    
    // Игнорируем ошибки "протухших" callback'ов
    if (err.error.description?.includes('query is too old')) {
      return;
    }
    
    // Для других ошибок можно отправить сообщение пользователю
    ctx.reply('Произошла непредвиденная ошибка. Попробуйте еще раз.').catch(() => {});
  });
  
  // Регистрируем обработчики текущей погоды ПЕРЕД welcome, чтобы они перехватывали callback'и
  registerCurrentWeatherHandlers(bot);
  registerWelcomeCommand(bot, weatherProvider);
  registerAddCommand(bot);
  registerListCommand(bot);
  registerWeatherCommand(bot, weatherProvider);
  registerSetupDialog(bot);
  
  await bot.api.getMe();
  logger('Bot is ready and running');
  bot.start();
}  

main().catch((err) => {
  logger('Fatal error:', err);
  console.error(err);
  process.exit(1);
});