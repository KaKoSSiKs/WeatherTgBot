import { createBot } from './bot';
import { registerStartCommand, registerAddCommand, registerListCommand } from './commands';
import { appConfig } from './config';
import { logger } from './utils/logger';

async function main() {
  logger('Bot starting...');
  logger('Bot Token:', appConfig.BOT_TOKEN);
  const bot = createBot();
  registerStartCommand(bot);
  registerAddCommand(bot);
  registerListCommand(bot);
  await bot.api.getMe();
  logger('Bot is ready and running');
  bot.start();
}  

main().catch((err) => {
  logger('Fatal error:', err);
  console.error(err);
  process.exit(1);
});