import type { Bot, Context } from 'grammy';
import { prisma } from '../db/prisma';
import { getOrCreateUser } from '../db/user';
import { logger } from '../utils/logger';

export function registerAddCommand(bot: Bot<Context>) {
  bot.command('add', async (ctx) => {
    try {
      const telegramId = ctx.from?.id.toString();
      if (!telegramId) {
        await ctx.reply('Ошибка: не удалось определить ваш ID.');
        return;
      }

      const user = await getOrCreateUser(telegramId, ctx.from?.language_code);

      // Parse command arguments: /add type [time] [days] [locationId]
      const args = ctx.message?.text?.split(' ').slice(1) || [];
      const type = args[0];
      const time = args[1];
      const days = args[2];
      const locationIdStr = args[3];

      if (!type) {
        await ctx.reply(
          'Использование: /add <тип> [время] [дни] [id_локации]\n\n' +
            'Примеры:\n' +
            '• /add daily 09:00\n' +
            '• /add daily 09:00 1,2,3,4,5\n' +
            '• /add weather 12:00\n' +
            '• /add daily 09:00 1,2,3,4,5 1'
        );
        return;
      }

      // Validate locationId if provided
      let locationId: number | undefined;
      if (locationIdStr) {
        const parsedLocationId = parseInt(locationIdStr, 10);
        if (isNaN(parsedLocationId)) {
          await ctx.reply('Ошибка: ID локации должен быть числом.');
          return;
        }
        // Verify location belongs to user
        const location = await prisma.location.findFirst({
          where: { id: parsedLocationId, userId: user.id },
        });
        if (!location) {
          await ctx.reply('Ошибка: локация с таким ID не найдена.');
          return;
        }
        locationId = parsedLocationId;
      }

      // Create notification
      const notification = await prisma.notification.create({
        data: {
          type,
          time: time || null,
          days: days || null,
          enabled: true,
          userId: user.id,
          locationId: locationId || null,
        },
        include: {
          location: true,
        },
      });

      const locationInfo = notification.location
        ? ` (${notification.location.name})`
        : '';
      const timeInfo = notification.time ? ` в ${notification.time}` : '';
      const daysInfo = notification.days ? ` (дни: ${notification.days})` : '';

      await ctx.reply(
        `✅ Уведомление добавлено!\n\n` +
          `Тип: ${notification.type}${locationInfo}${timeInfo}${daysInfo}\n` +
          `Статус: ${notification.enabled ? 'включено' : 'выключено'}`
      );

      logger('Notification created:', { id: notification.id, userId: user.id, type });
    } catch (error) {
      logger('Error in /add command:', error);
      await ctx.reply('Произошла ошибка при добавлении уведомления.');
    }
  });
}

