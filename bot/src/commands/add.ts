import type { Bot, Context } from 'grammy';
import type { Location } from '@prisma/client';
import { prisma } from '../db/prisma';
import { getOrCreateUser } from '../db/user';
import { logger } from '../utils/logger';
import { DEFAULT_CITY, geocodeCity } from '../utils/geocoding';
import { addMenuKeyboard, mainMenuKeyboard } from '../keyboards';
import { startAddFlow } from '../dialogs/setup';

const INTERACTIVE_HINT =
  '\n\nИспользуйте /add без параметров для интерактивной настройки с подсказками.';

async function handleTextAddCommand(ctx: Context) {
  const telegramId = ctx.from?.id?.toString();
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
        '• /add daily 09:00 1,3,5 Москва' +
        INTERACTIVE_HINT
    );
    return;
  }

  let locationRecord: Location | null = null;
  if (locationName) {
    const geocoded = geocodeCity(locationName);
    if (!geocoded) {
      await ctx.reply(
        `Местоположение "${locationName}" не найдено. Попробуйте, например, /add ${type} ${time} Москва.`
      );
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

  const notification = await prisma.notification.create({
    data: {
      type,
      time: time || null,
      enabled: true,
      userId: user.id,
      locationId: locationRecord?.id ?? null,
      days: days ?? null
    },
    include: {
      location: true
    }
  });

  const parts = [
    '✅ Уведомление добавлено!',
    '',
    `Тип: ${notification.type}`
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
}

async function showInteractiveMenu(ctx: Context) {
  await ctx.reply(
    'Создайте уведомление в интерактивном режиме. Выберите частоту, время или город, либо начните сразу:',
    { reply_markup: addMenuKeyboard() }
  );
}

function mapInteractiveType(payload?: string): string | undefined {
  switch (payload) {
    case 'daily':
      return 'daily';
    case 'weekly':
      return 'weekly';
    case 'trigger':
      return 'trigger';
    default:
      return undefined;
  }
}

function cityAliasToQuery(alias: string): string {
  switch (alias) {
    case 'moscow':
      return 'moscow';
    case 'spb':
      return 'санкт-петербург';
    case 'london':
      return 'london';
    default:
      return alias;
  }
}

export function registerAddCommand(bot: Bot<Context>) {
  bot.command('add', async (ctx) => {
    try {
      const args = ctx.message?.text?.trim().split(/\s+/).slice(1) || [];
      if (args.length === 0) {
        await showInteractiveMenu(ctx);
        return;
      }
      await handleTextAddCommand(ctx);
    } catch (error) {
      logger('Error in /add command:', error);
      await ctx.reply('Произошла ошибка при добавлении уведомления.');
    }
  });

  bot.callbackQuery(/^add:/, async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;
    const data = ctx.callbackQuery.data ?? '';
    await ctx.answerCallbackQuery();
    const parts = data.split(':');
    const action = parts[1];
    const payload = parts.slice(2).join(':');

    try {
      switch (action) {
        case 'start': {
          const type = mapInteractiveType(payload);
          await ctx.reply('Запускаю мастер создания уведомления...');
          await startAddFlow(ctx, type ? { notificationType: type } : {});
          break;
        }
        case 'time': {
          await ctx.reply(`Запускаю мастер с временем ${payload}. Укажите локацию и тип уведомлений.`);
          await startAddFlow(ctx, { time: payload });
          break;
        }
        case 'city': {
          const cityQuery = cityAliasToQuery(payload);
          const geocoded = geocodeCity(cityQuery);
          if (!geocoded) {
            await ctx.reply('Не удалось определить город. Попробуйте выбрать другой.');
            return;
          }
          await ctx.reply(`Используем локацию ${geocoded.name}. Выберите тип уведомлений.`);
          await startAddFlow(ctx, {
            locationName: geocoded.name,
            latitude: geocoded.latitude,
            longitude: geocoded.longitude
          });
          break;
        }
        case 'back': {
          await showInteractiveMenu(ctx);
          break;
        }
        case 'menu': {
          await ctx.reply('Главное меню:', { reply_markup: mainMenuKeyboard() });
          break;
        }
        case 'cancel': {
          await ctx.reply('Создание уведомления отменено.');
          break;
        }
        default:
          await ctx.reply('Неизвестная команда. Попробуйте снова.');
      }
    } catch (error) {
      logger('Error in add interactive flow:', error);
      await ctx.reply('Не удалось открыть мастер. Попробуйте ещё раз или используйте текстовый формат /add.');
    }
  });
}

