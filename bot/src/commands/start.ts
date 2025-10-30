import type { Bot, Context } from 'grammy';

export function registerStartCommand(bot: Bot<Context>) {
  bot.command('start', async (ctx) => {
    await ctx.reply(
      'Добро пожаловать! Настройте уведомления о погоде под себя.\n\n' +
        'Доступные команды:\n' +
        '• /add — добавить уведомление\n' +
        '• /list — список активных уведомлений\n' +
        '• /settings — настройки'
    );
  });
}
