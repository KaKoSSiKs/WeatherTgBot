import { Bot } from 'grammy';
import { appConfig } from './config';

export function createBot(): Bot {
  const bot = new Bot(appConfig.BOT_TOKEN);

  // Basic health command
  bot.command('ping', (ctx) => ctx.reply('pong'));

  return bot;
}
