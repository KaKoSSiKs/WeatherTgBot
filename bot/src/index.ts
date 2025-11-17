import { createBot } from './bot';
import {
  registerStartCommand,
  registerAddCommand,
  registerListCommand,
  registerWeatherCommand
} from './commands';
import { appConfig } from './config';
import { logger } from './utils/logger';
import { getWeatherProvider } from './weather/provider';

async function main() {
  logger('Bot starting...');
  logger('Bot Token:', appConfig.BOT_TOKEN);
  const bot = createBot();
  const weatherProvider = getWeatherProvider();
  registerStartCommand(bot);
  registerAddCommand(bot);
  registerListCommand(bot);
  registerWeatherCommand(bot, weatherProvider);
  await bot.api.getMe();
  logger('Bot is ready and running');
  bot.start();
}  

main().catch((err) => {
  logger('Fatal error:', err);
  console.error(err);
  process.exit(1);
});