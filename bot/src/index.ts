import { createBot } from './bot';
import { registerStartCommand } from './commands/start';

async function main() {
  const bot = createBot();

  registerStartCommand(bot);

  await bot.api.getMe();
  console.log('Bot is starting...');
  bot.start();
}

main().catch((err) => {
  console.error('Fatal error', err);
  process.exit(1);
});
