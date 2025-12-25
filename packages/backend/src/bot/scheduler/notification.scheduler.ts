/**
 * Notification Scheduler
 * 
 * Планировщик для обработки уведомлений.
 * Запускается каждую минуту и проверяет, какие уведомления нужно отправить.
 */

import { scheduleEveryMinute } from '../../shared/utils/cron';
import { NotificationService } from '../../services/notification';
import { logger } from '../../shared/utils/logger';
import type { Telegraf } from 'telegraf';

/**
 * Запустить планировщик уведомлений
 */
export function startNotificationScheduler(
  bot: Telegraf,
  notificationService: NotificationService
): { stop: () => void } {
  logger.info('Starting notification scheduler...');
  
  const job = scheduleEveryMinute(async () => {
    try {
      const result = await notificationService.processNotifications();
      
      if (result.sent > 0) {
        logger.info(
          `Notification scheduler: processed ${result.processed}, sent ${result.sent}, errors ${result.errors}`
        );
        
        // TODO: Отправка уведомлений через bot.telegram.sendMessage
        // Сейчас processNotifications только определяет, какие уведомления нужно отправить
        // Нужно получить список уведомлений, которые должны быть отправлены, и отправить их
        // Это можно сделать через расширение NotificationService или здесь
      }
      
    } catch (error) {
      logger.error('Error in notification scheduler:', error);
    }
  });
  
  return {
    stop: () => {
      logger.info('Stopping notification scheduler...');
      job.stop();
    },
  };
}

