import type { Bot, Context } from 'grammy';
import { prisma } from '../db/prisma';
import { getOrCreateUser } from '../db/user';
import { logger } from '../utils/logger';

export function registerListCommand(bot: Bot<Context>) {
  bot.command('list', async (ctx) => {
    try {
      const telegramId = ctx.from?.id.toString();
      if (!telegramId) {
        await ctx.reply('Ошибка: не удалось определить ваш ID.');
        return;
      }

      const user = await getOrCreateUser(telegramId, ctx.from?.language_code);

      // Fetch all notifications for the user
      const notifications = await prisma.notification.findMany({
        where: { userId: user.id },
        include: {
          location: true,
        },
        orderBy: { id: 'asc' },
      });

      if (notifications.length === 0) {
        await ctx.reply('У вас пока нет уведомлений.\n\nИспользуйте /add для добавления.');
        return;
      }

      // Format notifications list
      const notificationsList = notifications
        .map((notif, index) => {
          const status = notif.enabled ? '✅' : '❌';
          const locationInfo = notif.location ? ` | 📍 ${notif.location.name}` : '';
          const timeInfo = notif.time ? ` | ⏰ ${notif.time}` : '';
          const daysInfo = notif.days ? ` | 📅 ${notif.days}` : '';
          
          return (
            `${index + 1}. ${status} ${notif.type}${locationInfo}${timeInfo}${daysInfo}`
          );
        })
        .join('\n');

      await ctx.reply(
        `📋 Ваши уведомления (${notifications.length}):\n\n${notificationsList}\n\n` +
          `Используйте /add для добавления нового уведомления.`
      );

      logger('Notifications listed:', { userId: user.id, count: notifications.length });
    } catch (error) {
      logger('Error in /list command:', error);
      await ctx.reply('Произошла ошибка при получении списка уведомлений.');
    }
  });
}

