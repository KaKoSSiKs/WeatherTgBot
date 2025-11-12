import { createBot } from './bot';  
import { registerStartCommand } from './commands/start';  
import { appConfig } from './config';  
import { logger } from './utils/logger';  

async function main() {  
  const bot = createBot();  
  registerStartCommand(bot);  
  logger('Bot Token:', appConfig.BOT_TOKEN);  
  await bot.api.getMe();  
  logger('Bot is starting...');  
  bot.start();  
}  

main().catch((err) => {  
  logger('Fatal error', 'error');  
  console.error(err);  
  process.exit(1);  
});