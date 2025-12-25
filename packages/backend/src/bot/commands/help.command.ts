/**
 * Help Command
 * 
 * Команда /help - справка по командам.
 */

import type { Context } from 'telegraf';

/**
 * Обработать команду /help
 */
export async function handleHelpCommand(ctx: Context): Promise<void> {
  const helpMessage = 
    `📋 Справка по командам:\n\n` +
    `/start - Регистрация и приветствие\n` +
    `/weather - Текущая погода\n` +
    `/forecast - Прогноз на 5 дней\n` +
    `/help - Эта справка\n\n` +
    `💡 Для получения погоды необходимо добавить локацию.\n` +
    `Используйте /start для начала работы.`;
  
  await ctx.reply(helpMessage);
}

