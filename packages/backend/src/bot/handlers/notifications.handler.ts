/**
 * Notifications Handler
 * 
 * Обработчики для управления уведомлениями.
 */

import type { Context } from 'telegraf';
import { UserRepository } from '../../storage/prisma/repositories';
import { NotificationService } from '../../services/notification';
import { NotificationCallback } from '../keyboards/callback-data';
import {
  getNotificationMainKeyboard,
  getNotificationListKeyboard,
  getNotificationDetailKeyboard,
  getNotificationDeleteConfirmKeyboard,
} from '../keyboards/notifications.keyboard';
import { logger } from '../../shared/utils/logger';

/**
 * Показать главное меню уведомлений
 */
export async function showNotificationMain(ctx: Context): Promise<void> {
  try {
    const keyboard = getNotificationMainKeyboard();
    const message = '🔔 Уведомления\n\nВыберите действие:';

    if (ctx.callbackQuery) {
      try {
        await ctx.editMessageText(message, keyboard);
        await ctx.answerCbQuery();
      } catch (error: any) {
        if (error.description?.includes('message is not modified')) {
          await ctx.answerCbQuery();
          return;
        }
        await ctx.reply(message, keyboard);
      }
    } else {
      await ctx.reply(message, keyboard);
    }
  } catch (error) {
    logger.error('Error in showNotificationMain:', error);
    await ctx.reply('❌ Произошла ошибка при открытии меню уведомлений.');
  }
}

/**
 * Показать список уведомлений
 */
export async function showNotificationList(
  ctx: Context,
  notificationService: NotificationService
): Promise<void> {
  const telegramId = ctx.from?.id?.toString();
  if (!telegramId) return;

  try {
    const notifications = await notificationService.getUserNotifications(telegramId);
    
    if (notifications.length === 0) {
      const message = '📋 У вас пока нет уведомлений.\n\nИспользуйте кнопку "➕ Создать" для добавления.';
      const keyboard = getNotificationMainKeyboard();
      
      if (ctx.callbackQuery) {
        try {
          await ctx.editMessageText(message, keyboard);
          await ctx.answerCbQuery();
        } catch (error: any) {
          if (error.description?.includes('message is not modified')) {
            await ctx.answerCbQuery();
            return;
          }
          await ctx.reply(message, keyboard);
        }
      } else {
        await ctx.reply(message, keyboard);
      }
      return;
    }

    const keyboard = getNotificationListKeyboard(
      notifications.map(notif => ({
        id: notif.id,
        enabled: notif.enabled,
        customName: notif.customName,
      }))
    );

    const message = `📋 Ваши уведомления (${notifications.length}):`;

    if (ctx.callbackQuery) {
      try {
        await ctx.editMessageText(message, keyboard);
        await ctx.answerCbQuery();
      } catch (error: any) {
        if (error.description?.includes('message is not modified')) {
          await ctx.answerCbQuery();
          return;
        }
        await ctx.reply(message, keyboard);
      }
    } else {
      await ctx.reply(message, keyboard);
    }
  } catch (error) {
    logger.error('Error in showNotificationList:', error);
    await ctx.reply('❌ Произошла ошибка при получении списка уведомлений.');
  }
}

/**
 * Показать детали уведомления
 */
export async function showNotificationDetail(
  ctx: Context,
  notificationService: NotificationService,
  notificationId: number
): Promise<void> {
  const telegramId = ctx.from?.id?.toString();
  if (!telegramId) return;

  try {
    const notifications = await notificationService.getUserNotifications(telegramId);
    const notification = notifications.find(n => n.id === notificationId);

    if (!notification) {
      await ctx.reply('❌ Уведомление не найдено.');
      return;
    }

    const status = notification.enabled ? '✅ Включено' : '❌ Отключено';
    const name = notification.customName || `Уведомление #${notification.id}`;
    const type = notification.type;
    const subtype = notification.subtype;
    const schedule = notification.schedule;

    const message = `🔔 ${name}\n\n` +
      `Статус: ${status}\n` +
      `Тип: ${type}\n` +
      `Подтип: ${subtype}\n` +
      `Расписание: ${schedule}`;

    const keyboard = getNotificationDetailKeyboard(notification.id, notification.enabled);

    if (ctx.callbackQuery) {
      try {
        await ctx.editMessageText(message, keyboard);
        await ctx.answerCbQuery();
      } catch (error: any) {
        if (error.description?.includes('message is not modified')) {
          await ctx.answerCbQuery();
          return;
        }
        await ctx.reply(message, keyboard);
      }
    } else {
      await ctx.reply(message, keyboard);
    }
  } catch (error) {
    logger.error('Error in showNotificationDetail:', error);
    await ctx.reply('❌ Произошла ошибка при получении деталей уведомления.');
  }
}

/**
 * Переключить уведомление
 */
export async function toggleNotification(
  ctx: Context,
  notificationService: NotificationService,
  notificationId: number
): Promise<void> {
  const telegramId = ctx.from?.id?.toString();
  if (!telegramId) return;

  try {
    const notifications = await notificationService.getUserNotifications(telegramId);
    const notification = notifications.find(n => n.id === notificationId);

    if (!notification) {
      await ctx.reply('❌ Уведомление не найдено.');
      return;
    }

    await notificationService.toggleNotification(notificationId, telegramId, !notification.enabled);
    await ctx.answerCbQuery({ text: notification.enabled ? 'Уведомление отключено' : 'Уведомление включено' });
    await showNotificationDetail(ctx, notificationService, notificationId);
  } catch (error) {
    logger.error('Error in toggleNotification:', error);
    await ctx.reply('❌ Произошла ошибка при переключении уведомления.');
  }
}

/**
 * Удалить уведомление
 */
export async function deleteNotification(
  ctx: Context,
  notificationService: NotificationService,
  notificationId: number
): Promise<void> {
  const telegramId = ctx.from?.id?.toString();
  if (!telegramId) return;

  try {
    await notificationService.deleteNotification(notificationId, telegramId);
    await ctx.answerCbQuery({ text: 'Уведомление удалено' });
    await showNotificationList(ctx, notificationService);
  } catch (error) {
    logger.error('Error in deleteNotification:', error);
    await ctx.reply('❌ Произошла ошибка при удалении уведомления.');
  }
}

/**
 * Регистрация обработчиков уведомлений
 */
export function registerNotificationHandlers(
  bot: any,
  notificationService: NotificationService
): void {
  // Обработчики для уведомлений
  bot.action(/^notification:/, async (ctx: Context) => {
    try {
          await ctx.answerCbQuery();
    } catch (error: any) {
      if (error.description?.includes('query is too old')) {
        return;
      }
    }

    const data = ctx.callbackQuery && 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : '';
    const parsed = NotificationCallback.parse(data);
    
    if (!parsed) {
      await ctx.reply('Ошибка обработки запроса.');
      return;
    }

    const { action, id } = parsed;

    switch (action) {
      case 'main':
        await showNotificationMain(ctx);
        break;
      case 'list':
        await showNotificationList(ctx, notificationService);
        break;
      case 'detail':
        if (id) {
          await showNotificationDetail(ctx, notificationService, id);
        }
        break;
      case 'toggle':
        if (id) {
          await toggleNotification(ctx, notificationService, id);
        }
        break;
      case 'delete':
        if (id) {
          const keyboard = getNotificationDeleteConfirmKeyboard(id);
          await ctx.editMessageText('❓ Вы уверены, что хотите удалить это уведомление?', keyboard);
        }
        break;
      case 'delete_confirm':
        if (id) {
          await deleteNotification(ctx, notificationService, id);
        }
        break;
      case 'create':
        // TODO: Реализовать визард создания уведомления
        await ctx.reply('🔔 Создание уведомления\n\nИспользуйте команду /add для создания уведомления.');
        break;
    }
  });
}

