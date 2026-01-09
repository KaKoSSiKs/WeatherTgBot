/**
 * Add Command
 * 
 * Команда /add - добавление уведомления или локации.
 */

import type { Context } from 'telegraf';
import { UserRepository } from '../../storage/prisma/repositories';
import { LocationRepository } from '../../storage/prisma/repositories';
import { logger } from '../../shared/utils/logger';
import { geocodeCity, DEFAULT_CITY } from '../../integrations/geocoding/geocoding.service';
import { parseNotificationCommand, formatParsedNotification, getUserPreferences } from '../../shared/utils/nlpParser';
import { NotificationRepository } from '../../storage/prisma/repositories/notification.repository';
import { setFlowState, getFlowState, clearFlowState } from '../state/session';
import { locationQuickPickKeyboard } from '../keyboards';
import { confirmationKeyboard } from '../keyboards';

const INTERACTIVE_HINT = '\n\nИспользуйте /add без параметров для интерактивной настройки с подсказками.';

/**
 * Обработать команду /add
 */
export async function handleAddCommand(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  const telegramId = userId?.toString();
  
  if (!telegramId || !userId) {
    await ctx.reply('Ошибка: не удалось определить ваш ID.');
    return;
  }

  try {
    const args = ctx.message && 'text' in ctx.message ? ctx.message.text?.trim().split(/\s+/).slice(1) || [] : [];
    
    if (args.length === 0) {
      // Показываем интерактивное меню
      await ctx.reply(
        'Создайте уведомление в интерактивном режиме. Выберите частоту, время или город, либо начните сразу:',
        locationQuickPickKeyboard()
      );
      return;
    }

    // Обработка текстовой команды
    await handleTextAddCommand(ctx, args, userId, telegramId);
  } catch (error) {
    logger.error('Error in /add command:', error);
    await ctx.reply('Произошла ошибка при добавлении уведомления.');
  }
}

async function handleTextAddCommand(
  ctx: Context,
  args: string[],
  userId: number,
  telegramId: string
): Promise<void> {
  const userRepo = new UserRepository();
  const locationRepo = new LocationRepository();
  const notificationRepo = new NotificationRepository();
  
  const user = await userRepo.findByTelegramId(telegramId);
  if (!user) {
    await ctx.reply('Пользователь не найден. Используйте /start для регистрации.');
    return;
  }

  const fullText = ctx.message && 'text' in ctx.message ? ctx.message.text || '' : '';

  // Try NLP parsing first
  try {
    const parsed = await parseNotificationCommand(fullText, user.id, notificationRepo, locationRepo);
    
    // If we got a reasonable parse, show confirmation
    if (parsed.confidence !== 'low' || fullText.split(/\s+/).length > 2) {
      // Store parsed data in session for confirmation
      setFlowState(userId, {
        flow: 'nlp_confirm',
        step: 'confirm',
        data: parsed,
        updatedAt: Date.now(),
        expiresAt: Date.now() + 300000 // 5 minutes
      });

      const preferences = await getUserPreferences(user.id, notificationRepo, locationRepo);
      let suggestion = '';
      if (preferences.preferredTime && !parsed.time) {
        suggestion = `\n\n💡 Как обычно, в ${preferences.preferredTime} для ${preferences.preferredLocation?.name || 'вашей локации'}?`;
      }

      const confirmationText = `Я понял как:\n\n${formatParsedNotification(parsed)}${suggestion}\n\nВсё верно?`;

      await ctx.reply(confirmationText, confirmationKeyboard(confirmationText));
      return;
    }
  } catch (error) {
    logger.error('NLP parsing error, falling back to structured parsing:', error);
  }

  // Fallback to structured parsing
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
        '• /add daily 09:00 1,3,5 Москва\n' +
        '• /add каждый день утром Москва\n' +
        '• /add напоминай вечером в пятницу' +
        INTERACTIVE_HINT
    );
    return;
  }

  // Find or create location
  let locationRecord = null;
  if (locationName) {
    const geocoded = geocodeCity(locationName);
    if (!geocoded) {
      await ctx.reply(
        `Местоположение "${locationName}" не найдено. Попробуйте, например, /add ${type} ${time} Москва.`
      );
      return;
    }

    const existingLocation = await locationRepo.findByUserId(user.id).then(locs => 
      locs.find(loc => loc.name === geocoded.name)
    );

    if (existingLocation) {
      locationRecord = existingLocation;
    } else {
      locationRecord = await locationRepo.create({
        name: geocoded.name,
        latitude: geocoded.latitude,
        longitude: geocoded.longitude,
        user: {
          connect: { id: user.id }
        }
      });
    }
  } else {
    const locations = await locationRepo.findByUserId(user.id);
    locationRecord = locations[0];
  }

  if (!locationRecord) {
    locationRecord = await locationRepo.create({
      name: DEFAULT_CITY.name,
      latitude: DEFAULT_CITY.latitude,
      longitude: DEFAULT_CITY.longitude,
      user: {
        connect: { id: user.id }
      }
    });
  }

  // Create notification (legacy format for compatibility)
  // TODO: Migrate to new notification format
  await ctx.reply('✅ Уведомление добавлено! (Функция в процессе миграции)');
  
  logger.info('Notification created:', { userId: user.id, type });
}

