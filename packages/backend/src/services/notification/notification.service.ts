/**
 * Notification Service
 * 
 * Сервис для управления уведомлениями о погоде.
 * Интегрируется с WeatherService для получения данных о погоде.
 */

import { NotificationRepository } from '../../storage/prisma/repositories/notification.repository';
import { UserSettingsRepository } from '../../storage/prisma/repositories/user-settings.repository';
import { LocationRepository } from '../../storage/prisma/repositories/location.repository';
import { WeatherService } from '../weather/weather.service';
import { scheduleEveryMinute, type CronJobHandle } from '../../bot/scheduler/cron';
import { logger } from '../../shared/utils/logger';
import { DateTime } from 'luxon';
import type { Telegraf } from 'telegraf';

// Типы параметров уведомлений
export interface RegularForecastParams {
  time: string; // "HH:mm"
  targetDate?: string; // для once
}

export interface TemperatureEventParams {
  direction: 'increase' | 'decrease' | 'any';
  threshold: number;
  checkIntervalHours: number;
  lastTemperature?: number;
}

export interface PrecipitationEventParams {
  precipitationType: 'rain' | 'snow' | 'any';
  eventType: 'start' | 'end';
  checkIntervalHours: number;
  lastPrecipitationState?: boolean;
}

export interface WindEventParams {
  threshold: number;
  checkIntervalHours: number;
}

export type NotificationParams = 
  | RegularForecastParams 
  | TemperatureEventParams 
  | PrecipitationEventParams 
  | WindEventParams;

// Тип подписки
export type SubscriptionType = 'regular_forecast' | 'weather_event';

// Подтип прогноза
export type ForecastSubtype = 'current' | 'today' | 'tomorrow' | '3day' | '7day' | '10day';

// Подтип события
export type EventSubtype = 'temperature_change' | 'precipitation' | 'wind';

// Расписание
export type ScheduleType = 'daily' | 'weekdays' | 'weekends' | 'once';

/**
 * Notification Service Class
 */
export class NotificationService {
  private schedulerHandle: CronJobHandle | null = null;
  private timezone: string;
  private bot: Telegraf | null = null;

  constructor(
    private notificationRepo: NotificationRepository,
    private settingsRepo: UserSettingsRepository,
    private locationRepo: LocationRepository,
    private weatherService: WeatherService,
    timezone: string = 'Europe/Moscow'
  ) {
    this.timezone = timezone;
  }

  /**
   * Установить бота для отправки сообщений
   */
  setBot(bot: Telegraf): void {
    this.bot = bot;
  }

  /**
   * Создать новое уведомление
   */
  async createNotification(data: {
    userId: number;
    chatId: number;
    locationId: number;
    subscriptionType: SubscriptionType;
    subtype: string;
    parameters: NotificationParams;
    schedule: ScheduleType;
    customName?: string;
  }): Promise<number> {
    try {
      const nextNotification = this.calculateNextNotification(
        data.subscriptionType,
        data.schedule,
        data.parameters
      );

      const notification = await this.notificationRepo.create({
        user: {
          connect: { id: data.userId }
        },
        location: data.locationId ? {
          connect: { id: data.locationId }
        } : undefined,
        type: data.subscriptionType === 'regular_forecast' ? 'REGULAR_FORECAST' : 'WEATHER_EVENT',
        subtype: data.subtype,
        schedule: data.schedule.toUpperCase() as any,
        parameters: data.parameters as any,
        customName: data.customName || null,
        enabled: true,
        nextNotificationAt: nextNotification
      });

      logger.info(`Created notification ${notification.id} for user ${data.userId}`);
      return notification.id;
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Получить все уведомления пользователя
   */
  async getUserNotifications(userId: number) {
    return this.notificationRepo.findByUserId(userId);
  }

  /**
   * Получить уведомление по ID
   */
  async getNotificationById(id: number) {
    return this.notificationRepo.findById(id);
  }

  /**
   * Рассчитать время следующего уведомления
   */
  private calculateNextNotification(
    subscriptionType: string,
    schedule: string,
    params: NotificationParams
  ): Date {
    const now = DateTime.now().setZone(this.timezone);

    if (subscriptionType === 'regular_forecast') {
      const forecastParams = params as RegularForecastParams;
      const timeStr = forecastParams.time || '08:00';
      const [hours, minutes] = timeStr.split(':').map(Number);

      let nextDate = now.set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });

      // Если время уже прошло сегодня, переносим на завтра
      if (nextDate <= now) {
        nextDate = nextDate.plus({ days: 1 });
      }

      // Обработка расписания
      if (schedule === 'weekdays') {
        // Пропускаем выходные (6 = суббота, 7 = воскресенье в Luxon)
        while (nextDate.weekday === 6 || nextDate.weekday === 7) {
          nextDate = nextDate.plus({ days: 1 });
        }
      } else if (schedule === 'weekends') {
        // Пропускаем будни
        while (nextDate.weekday >= 1 && nextDate.weekday <= 5) {
          nextDate = nextDate.plus({ days: 1 });
        }
      } else if (schedule === 'once') {
        // Разовое уведомление
        if (forecastParams.targetDate) {
          const targetDateTime = DateTime.fromISO(forecastParams.targetDate).setZone(this.timezone);
          nextDate = targetDateTime.set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });
        }
      }

      return nextDate.toJSDate();
    } else {
      // Для погодных событий проверяем каждые N часов
      let checkInterval = 2;
      
      if ('checkIntervalHours' in params) {
        checkInterval = (params as TemperatureEventParams | PrecipitationEventParams | WindEventParams).checkIntervalHours || 2;
      }
      
      const nextCheck = now.plus({ hours: checkInterval });
      return nextCheck.toJSDate();
    }
  }

  /**
   * Переключить состояние уведомления
   */
  async toggleNotification(id: number): Promise<boolean> {
    try {
      const notification = await this.notificationRepo.findById(id);
      if (!notification) return false;

      const newEnabled = !notification.enabled;
      let nextNotificationAt: Date | null = null;

      if (newEnabled) {
        const params = notification.parameters as any as NotificationParams;
        nextNotificationAt = this.calculateNextNotification(
          notification.type,
          notification.schedule,
          params
        );
      }

      await this.notificationRepo.setEnabled(id, newEnabled);
      if (nextNotificationAt) {
        await this.notificationRepo.updateNextNotification(id, nextNotificationAt);
      }

      logger.info(`Toggled notification ${id} to ${newEnabled ? 'enabled' : 'disabled'}`);
      return true;
    } catch (error) {
      logger.error('Error toggling notification:', error);
      return false;
    }
  }

  /**
   * Удалить уведомление
   */
  async deleteNotification(id: number): Promise<boolean> {
    try {
      await this.notificationRepo.delete(id);
      logger.info(`Deleted notification ${id}`);
      return true;
    } catch (error) {
      logger.error('Error deleting notification:', error);
      return false;
    }
  }

  /**
   * Запустить планировщик
   */
  startScheduler(): void {
    if (this.schedulerHandle) {
      logger.warn('Scheduler already running');
      return;
    }

    this.schedulerHandle = scheduleEveryMinute(async () => {
      await this.checkAndSendNotifications();
    });

    logger.info('Notification scheduler started');
  }

  /**
   * Остановить планировщик
   */
  stopScheduler(): void {
    if (this.schedulerHandle) {
      this.schedulerHandle.stop();
      this.schedulerHandle = null;
      logger.info('Notification scheduler stopped');
    }
  }

  /**
   * Проверить и отправить уведомления
   */
  private async checkAndSendNotifications(): Promise<void> {
    try {
      const now = new Date();
      const notifications = await this.notificationRepo.findActiveDue(now);

      if (notifications.length === 0) return;

      logger.info(`Found ${notifications.length} notifications to process`);

      for (const notification of notifications) {
        try {
          // TODO: Реализовать отправку уведомлений
          // await this.sendNotification(notification);
          
          // Обновляем время следующего уведомления
          const params = notification.parameters as any as NotificationParams;
          const nextNotification = this.calculateNextNotification(
            notification.type,
            notification.schedule,
            params
          );
          await this.notificationRepo.updateNextNotification(notification.id, nextNotification);
        } catch (error) {
          logger.error(`Error processing notification ${notification.id}:`, error);
        }
      }
    } catch (error) {
      logger.error('Error in checkAndSendNotifications:', error);
    }
  }
}

