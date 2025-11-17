import type { Bot, Context } from 'grammy';
import type { Location } from '@prisma/client';
import { prisma } from '../db/prisma';
import { getOrCreateUser } from '../db/user';
import { logger } from '../utils/logger';
import { DEFAULT_CITY, geocodeCity } from '../utils/geocoding';

export function registerAddCommand(bot: Bot<Context>) {
  bot.command('add', async (ctx) => {
    try {
      const telegramId = ctx.from?.id.toString();
      if (!telegramId) {
        await ctx.reply('Ошибка: не удалось определить ваш ID.');
        return;
      }

      const user = await getOrCreateUser(telegramId, ctx.from?.language_code);

      const args = ctx.message?.text?.trim().split(/\s+/).slice(1) || [];
      const type = args[0];
      const time = args[1];
      const possibleDays = args[2];
      let days: string | undefined;
      let locationName = '';

      if (args.length >= 4) {
        days = possibleDays;
        locationName = args.slice(3).join(' ').trim();
      } else if (args.length === 3) {
        locationName = possibleDays ?? '';
      }

      if (!type || !time) {
        await ctx.reply(
          'Использование: /add <тип> <время> [дни] [местоположение]\n\n' +
            'Примеры:\n' +
            '• /add daily 09:00 Москва\n' +
            '• /add daily 09:00 1,3,5 Москва'
        );
        return;
      }

      let locationRecord: Location | null = null;
      if (locationName) {
        const geocoded = geocodeCity(locationName);
        if (!geocoded) {
          await ctx.reply(`Местоположение "${locationName}" не найдено.`);
          return;
        }

        const existingLocation = await prisma.location.findFirst({
          where: { userId: user.id, name: geocoded.name }
        });

        if (existingLocation) {
          if (
            existingLocation.latitude !== geocoded.latitude ||
            existingLocation.longitude !== geocoded.longitude
          ) {
            locationRecord = await prisma.location.update({
              where: { id: existingLocation.id },
              data: {
                latitude: geocoded.latitude,
                longitude: geocoded.longitude
              }
            });
          } else {
            locationRecord = existingLocation;
          }
        } else {
          locationRecord = await prisma.location.create({
            data: {
              name: geocoded.name,
              latitude: geocoded.latitude,
              longitude: geocoded.longitude,
              userId: user.id
            }
          });
        }
      } else {
        locationRecord = await prisma.location.findFirst({
          where: { userId: user.id },
          orderBy: { id: 'desc' }
        });
      }

      if (!locationRecord) {
        locationRecord = await prisma.location.create({
          data: {
            name: DEFAULT_CITY.name,
            latitude: DEFAULT_CITY.latitude,
            longitude: DEFAULT_CITY.longitude,
            userId: user.id
          }
        });
      }

      // Create notification
      const notification = await prisma.notification.create({
        data: {
          type,
          time: time || null,
          enabled: true,
          userId: user.id,
          locationId: locationRecord?.id ?? null,
          days: days ?? null,
        },
        include: {
          location: true,
        },
      });

      const parts = [
        '✅ Уведомление добавлено!',
        '',
        `Тип: ${notification.type}`,
      ];
      if (notification.time) {
        parts.push(`Время: ${notification.time}`);
      }
      if (notification.days) {
        parts.push(`Дни: ${notification.days}`);
      }
      if (notification.location) {
        parts.push(`Локация: ${notification.location.name}`);
      }
      parts.push(`Статус: ${notification.enabled ? 'включено' : 'выключено'}`);

      await ctx.reply(parts.join('\n'));

      logger('Notification created:', { id: notification.id, userId: user.id, type });
    } catch (error) {
      logger('Error in /add command:', error);
      await ctx.reply('Произошла ошибка при добавлении уведомления.');
    }
  });
}

