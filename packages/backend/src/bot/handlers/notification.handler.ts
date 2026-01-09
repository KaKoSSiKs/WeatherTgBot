/**
 * Notification Handler
 * 
 * Обработчик callback'ов для системы уведомлений.
 */

import type { Context } from 'telegraf';
import { NotificationCallback, NotifCreateCallback } from '../keyboards/callback_data';
import {
  notificationMainKeyboard,
  notificationListKeyboard,
  notificationEmptyListKeyboard,
  notificationDetailKeyboard,
  notificationDeleteConfirmKeyboard,
  notificationSentKeyboard,
} from '../keyboards/notifications';
import { NotificationService } from '../../services/notification/notification.service';
import { UserRepository } from '../../storage/prisma/repositories';
import { LocationRepository } from '../../storage/prisma/repositories/location.repository';
import { getState, setState, clearState } from '../state/session';
import { popNavigationState, pushNavigationState } from '../../shared/utils/navigation';
import { handleError } from './error.handler';
import { logger } from '../../shared/utils/logger';

/**
 * Получить текст для главного меню уведомлений
 */
function getNotificationMainText(activeCount: number, pausedCount: number, totalCount: number): string {
  return `🔔 Уведомления о погоде

Настройте автоматические уведомления о погоде и погодных событиях.

📊 Статистика:
✅ Активных: ${activeCount}
⏸️ Приостановленных: ${pausedCount}
📌 Всего: ${totalCount}

Выберите действие:`;
}

/**
 * Обработчик callback'ов уведомлений
 */
export async function handleNotificationCallback(
  ctx: Context,
  notificationService: NotificationService
): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

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
    return;
  }

  const telegramId = userId.toString();
  const userRepo = new UserRepository();
  const user = await userRepo.findByTelegramId(telegramId);
  
  if (!user) {
    await ctx.reply('❌ Пользователь не найден. Используйте /start для регистрации.');
    return;
  }

  try {
    switch (parsed.action) {
      case 'main': {
        const notifications = await notificationService.getUserNotifications(user.id);
        const activeCount = notifications.filter(n => n.enabled).length;
        const pausedCount = notifications.filter(n => !n.enabled).length;
        const totalCount = notifications.length;
        
        const text = getNotificationMainText(activeCount, pausedCount, totalCount);
        const result = await ctx.editMessageText(text, notificationMainKeyboard());
        
        if (result && typeof result === 'object' && 'message_id' in result) {
          pushNavigationState(userId, 'notifications_main', {}, result.message_id);
        }
        break;
      }
      
      case 'list': {
        const page = parsed.id ? Number(parsed.id) : 0;
        const notifications = await notificationService.getUserNotifications(user.id);
        
        if (notifications.length === 0) {
          const text = '📋 Мои подписки\n\nУ вас пока нет подписок на уведомления.';
          await ctx.editMessageText(text, notificationEmptyListKeyboard());
          return;
        }
        
        // Форматируем список уведомлений
        const itemsPerPage = 5;
        const totalPages = Math.ceil(notifications.length / itemsPerPage);
        const startIndex = page * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, notifications.length);
        const pageNotifications = notifications.slice(startIndex, endIndex);
        
        const notificationsList = pageNotifications
          .map((notif, index) => {
            const status = notif.enabled ? '✅' : '⏸️';
            const name = notif.customName || `${notif.type} - ${notif.subtype}`;
            return `${status} ${name}`;
          })
          .join('\n');
        
        const text = `📋 Мои подписки (${notifications.length}):\n\n${notificationsList}`;
        await ctx.editMessageText(
          text,
          notificationListKeyboard(
            pageNotifications.map(n => ({
              id: n.id,
              displayName: n.customName || `${n.type} - ${n.subtype}`,
              isActive: n.enabled
            })),
            page,
            totalPages
          )
        );
        break;
      }
      
      case 'detail': {
        if (!parsed.id) {
          await ctx.reply('❌ Ошибка: не указан ID уведомления.');
          return;
        }
        
        const notification = await notificationService.getNotificationById(Number(parsed.id));
        
        if (!notification || notification.userId !== user.id) {
          await ctx.reply('❌ Уведомление не найдено.');
          return;
        }
        
        const params = notification.parameters as any;
        const scheduleText = notification.schedule === 'DAILY' ? 'Ежедневно' :
                           notification.schedule === 'WEEKDAYS' ? 'По будням' :
                           notification.schedule === 'WEEKENDS' ? 'По выходным' :
                           notification.schedule === 'ONCE' ? 'Один раз' : notification.schedule;
        
        let detailsText = `📋 Подписка: ${notification.customName || `${notification.type} - ${notification.subtype}`}\n\n`;
        detailsText += `Тип: ${notification.type === 'REGULAR_FORECAST' ? 'Регулярный прогноз' : 'Погодное событие'}\n`;
        detailsText += `Подтип: ${notification.subtype}\n`;
        detailsText += `Расписание: ${scheduleText}\n`;
        detailsText += `Статус: ${notification.enabled ? '✅ Активна' : '⏸️ Приостановлена'}\n`;
        
        if (params?.time) {
          detailsText += `Время: ${params.time}\n`;
        }
        if (params?.threshold) {
          detailsText += `Порог: ${params.threshold}\n`;
        }
        if (params?.direction) {
          const dirText = params.direction === 'increase' ? 'Потепление' :
                         params.direction === 'decrease' ? 'Похолодание' :
                         'Любое изменение';
          detailsText += `Направление: ${dirText}\n`;
        }
        
        if (notification.nextNotificationAt) {
          const nextDate = new Date(notification.nextNotificationAt);
          detailsText += `\nСледующее уведомление: ${nextDate.toLocaleString('ru-RU')}`;
        }
        
        await ctx.editMessageText(
          detailsText,
          notificationDetailKeyboard(notification.id, notification.enabled)
        );
        break;
      }
      
      case 'toggle': {
        if (!parsed.id) {
          await ctx.reply('❌ Ошибка: не указан ID уведомления.');
          return;
        }
        
        const notification = await notificationService.getNotificationById(Number(parsed.id));
        
        if (!notification || notification.userId !== user.id) {
          await ctx.reply('❌ Уведомление не найдено.');
          return;
        }
        
        await notificationService.toggleNotification(Number(parsed.id));
        await ctx.answerCbQuery(notification.enabled ? 'Уведомление приостановлено' : 'Уведомление возобновлено');
        
        // Обновляем детальный вид
        const updated = await notificationService.getNotificationById(Number(parsed.id));
        if (updated) {
          const params = updated.parameters as any;
          const scheduleText = updated.schedule === 'DAILY' ? 'Ежедневно' :
                             updated.schedule === 'WEEKDAYS' ? 'По будням' :
                             updated.schedule === 'WEEKENDS' ? 'По выходным' :
                             updated.schedule === 'ONCE' ? 'Один раз' : updated.schedule;
          
          let detailsText = `📋 Подписка: ${updated.customName || `${updated.type} - ${updated.subtype}`}\n\n`;
          detailsText += `Тип: ${updated.type === 'REGULAR_FORECAST' ? 'Регулярный прогноз' : 'Погодное событие'}\n`;
          detailsText += `Подтип: ${updated.subtype}\n`;
          detailsText += `Расписание: ${scheduleText}\n`;
          detailsText += `Статус: ${updated.enabled ? '✅ Активна' : '⏸️ Приостановлена'}\n`;
          
          if (params?.time) {
            detailsText += `Время: ${params.time}\n`;
          }
          
          await ctx.editMessageText(
            detailsText,
            notificationDetailKeyboard(updated.id, updated.enabled)
          );
        }
        break;
      }
      
      case 'delete': {
        if (!parsed.id) {
          await ctx.reply('❌ Ошибка: не указан ID уведомления.');
          return;
        }
        
        const notification = await notificationService.getNotificationById(Number(parsed.id));
        
        if (!notification || notification.userId !== user.id) {
          await ctx.reply('❌ Уведомление не найдено.');
          return;
        }
        
        await ctx.editMessageText(
          `🗑️ Удаление подписки\n\nВы уверены, что хотите удалить подписку "${notification.customName || `${notification.type} - ${notification.subtype}`}"?`,
          notificationDeleteConfirmKeyboard(Number(parsed.id))
        );
        break;
      }
      
      case 'delete_confirm': {
        if (!parsed.id) {
          await ctx.reply('❌ Ошибка: не указан ID уведомления.');
          return;
        }
        
        await notificationService.deleteNotification(Number(parsed.id));
        await ctx.answerCbQuery('Подписка удалена');
        await ctx.editMessageText('✅ Подписка успешно удалена.', notificationMainKeyboard());
        break;
      }
      
      case 'add': {
        // Начинаем визард создания уведомления
        clearState(userId, 'notification_create');
        setState(userId, 'notification_create', { step: 'type', data: {} });
        
        const text = `🔔 Создание подписки\n\nВыберите тип уведомления:`;
        const { notifCreateTypeKeyboard } = await import('../keyboards/notifications');
        await ctx.editMessageText(text, notifCreateTypeKeyboard());
        break;
      }
      
      default:
        logger.warn(`Unknown notification action: ${parsed.action}`);
    }
  } catch (error) {
    logger.error('Error in notification handler:', error);
    const errorMessage = handleError(ctx, error);
    await ctx.reply(errorMessage);
  }
}

