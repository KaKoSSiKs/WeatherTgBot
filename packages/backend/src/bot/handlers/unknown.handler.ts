/**
 * Unknown Handler
 * 
 * Обработка неизвестных команд и сообщений.
 */

import type { Context } from 'telegraf';

/**
 * Обработать неизвестную команду
 */
export async function handleUnknownCommand(ctx: Context): Promise<void> {
  await ctx.reply(
    '❓ Неизвестная команда.\n\n' +
    'Используйте /help для списка доступных команд.'
  );
}

/**
 * Обработать неизвестное сообщение
 */
export async function handleUnknownMessage(ctx: Context): Promise<void> {
  await ctx.reply(
    '👋 Привет!\n\n' +
    'Я бот погоды. Используйте команды для получения информации о погоде.\n\n' +
    'Используйте /help для списка команд.'
  );
}

