/**
 * List Command
 * 
 * Команда /list - список уведомлений пользователя.
 */

import type { Context } from 'telegraf';
import { UserRepository } from '../../storage/prisma/repositories';
import { NotificationRepository } from '../../storage/prisma/repositories/notification.repository';
import { logger } from '../../shared/utils/logger';

/**
 * Обработать команду /list
 */
export async function handleListCommand(ctx: Context): Promise<void> {
  const telegramId = ctx.from?.id?.toString();
  
  if (!telegramId) {
    await ctx.reply('Ошибка: не удалось определить ваш ID.');
    return;
  }

  try {
    const userRepo = new UserRepository();
    const notificationRepo = new NotificationRepository();
    
    const user = await userRepo.findByTelegramId(telegramId);
    if (!user) {
      await ctx.reply('Пользователь не найден. Используйте /start для регистрации.');
      return;
    }

    // Fetch all notifications for the user
    const notifications = await notificationRepo.findByUserId(user.id);

    if (notifications.length === 0) {
      await ctx.reply('У вас пока нет уведомлений.\n\nИспользуйте /add для добавления.');
      return;
    }

    // Format notifications list
    const notificationsList = notifications
      .map((notif, index) => {
        const status = notif.enabled ? '✅' : '❌';
        const params = notif.parameters as any;
        const timeInfo = params?.time ? ` | ⏰ ${params.time}` : '';
        const daysInfo = params?.days ? ` | 📅 ${params.days}` : '';
        
        return `${index + 1}. ${status} ${notif.type}${timeInfo}${daysInfo}`;
      })
      .join('\n');

    await ctx.reply(
      `📋 Ваши уведомления (${notifications.length}):\n\n${notificationsList}\n\n` +
        `Используйте /add для добавления нового уведомления.`
    );

    logger.info('Notifications listed:', { userId: user.id, count: notifications.length });
  } catch (error) {
    logger.error('Error in /list command:', error);
    await ctx.reply('Произошла ошибка при получении списка уведомлений.');
  }
}

