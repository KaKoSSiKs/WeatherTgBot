/**
 * List Command
 * 
 * Команда /list - список всех уведомлений пользователя.
 * Тексты и форматирование перенесены из старого бота (bot/).
 */

import type { Context } from 'telegraf';
import { UserRepository, LocationRepository } from '../../storage/prisma/repositories';
import { NotificationService } from '../../services/notification';
import { logger } from '../../shared/utils/logger';
import type { Notification } from '@prisma/client';
import type { RegularForecastParams } from '../../shared/types/notification.types';

/**
 * Получить отображаемое название типа уведомления
 */
function getDisplayType(type: string, subtype: string): string {
  if (type === 'REGULAR_FORECAST') {
    return subtype === 'current' ? 'Текущая погода' : 'Прогноз на сегодня';
  } else if (type === 'WEATHER_EVENT') {
    switch (subtype) {
      case 'temperature_change':
        return 'Изменение температуры';
      case 'precipitation':
        return 'Осадки';
      case 'wind':
        return 'Ветер';
      default:
        return 'Погодное событие';
    }
  }
  return type;
}

/**
 * Обработать команду /list
 */
export async function handleListCommand(
  ctx: Context,
  notificationService: NotificationService
): Promise<void> {
  const telegramId = ctx.from?.id?.toString();
  
  if (!telegramId) {
    await ctx.reply('Ошибка: не удалось определить ваш ID.');
    return;
  }
  
  try {
    // Получаем все уведомления пользователя
    const notifications = await notificationService.getUserNotifications(telegramId);
    
    if (notifications.length === 0) {
      await ctx.reply('У вас пока нет уведомлений.\n\nИспользуйте /add для добавления.');
      return;
    }
    
    // Получаем локации для форматирования
    const locationRepo = new LocationRepository();
    const userRepo = new UserRepository();
    const user = await userRepo.findByTelegramId(telegramId);
    if (!user) {
      await ctx.reply('Ошибка: пользователь не найден.');
      return;
    }
    
    // Форматируем список уведомлений (как в старом боте)
    const notificationsList = await Promise.all(
      notifications.map(async (notif, index) => {
        const status = notif.enabled ? '✅' : '❌';
        const displayType = getDisplayType(notif.type, notif.subtype);
        
        // Получаем информацию о локации
        let locationInfo = '';
        if (notif.locationId) {
          const location = await locationRepo.findById(notif.locationId);
          if (location) {
            locationInfo = ` | 📍 ${location.name}`;
          }
        }
        
        // Получаем время и дни из parameters
        let timeInfo = '';
        let daysInfo = '';
        if (notif.type === 'REGULAR_FORECAST') {
          const params = notif.parameters as unknown as RegularForecastParams;
          if (params.time) {
            timeInfo = ` | ⏰ ${params.time}`;
          }
        }
        
        return `${index + 1}. ${status} ${displayType}${locationInfo}${timeInfo}${daysInfo}`;
      })
    );
    
    await ctx.reply(
      `📋 Ваши уведомления (${notifications.length}):\n\n${notificationsList.join('\n')}\n\n` +
      `Используйте /add для добавления нового уведомления.`
    );
    
    logger.debug(`Notifications listed: ${notifications.length} for user ${telegramId}`);
    
  } catch (error) {
    logger.error('Error in /list command:', error);
    await ctx.reply('Произошла ошибка при получении списка уведомлений.');
  }
}

