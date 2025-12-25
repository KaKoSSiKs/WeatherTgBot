/**
 * Notification Service
 * 
 * Сервис для управления уведомлениями о погоде.
 * Содержит всю бизнес-логику работы с уведомлениями.
 */

import {
  NotificationRepository,
  UserRepository,
} from '../../storage/prisma/repositories';
import type { WeatherService } from '../weather/weather.service';
import type {
  CreateNotificationData,
  UpdateNotificationData,
  NotificationParams,
  RegularForecastParams,
  TemperatureEventParams,
  PrecipitationEventParams,
  WindEventParams,
  NotificationCheckResult,
} from '../../shared/types/notification.types';
import type { Notification, NotificationType, ScheduleType } from '@prisma/client';
import {
  UserNotFoundError,
  LocationNotSetError,
} from '../../shared/errors/domain.errors';
import { logger } from '../../shared/utils/logger';

/**
 * Notification Service
 */
export class NotificationService {
  constructor(
    private notificationRepo: NotificationRepository = new NotificationRepository(),
    private userRepo: UserRepository = new UserRepository(),
    private weatherService: WeatherService
  ) {}

  /**
   * Создать уведомление
   * 
   * @param data - Данные уведомления (включая telegramId)
   */
  async createNotification(data: CreateNotificationData): Promise<Notification> {
    const userId = await this.getUserInternalId(data.telegramId);

    // Проверяем, что пользователь существует и локация доступна (через WeatherService)
    // Это также проверит наличие дефолтной локации, если locationId не указан
    await this.weatherService.getCurrentWeatherForUser(data.telegramId, data.locationId);

    // Вычисляем время следующего уведомления
    const nextNotificationAt = this.calculateNextNotification(
      data.schedule,
      data.parameters
    );

    // Создаем уведомление
    const notification = await this.notificationRepo.create({
      user: {
        connect: {
          id: userId,
        },
      },
      location: data.locationId
        ? { connect: { id: data.locationId } }
        : undefined,
      type: data.type,
      subtype: data.subtype,
      schedule: data.schedule,
      parameters: data.parameters as any, // JSON в Prisma
      customName: data.customName,
      nextNotificationAt,
    });

    logger.debug(`NotificationService: Created notification ${notification.id} for user ${userId}`);

    return notification;
  }

  /**
   * Обновить уведомление
   */
  async updateNotification(
    notificationId: number,
    userId: string | number,
    data: UpdateNotificationData
  ): Promise<Notification> {
    // Проверяем принадлежность
    const notification = await this.notificationRepo.findByIdAndUserId(
      notificationId,
      typeof userId === 'string' 
        ? await this.getUserInternalId(userId)
        : userId
    );

    if (!notification) {
      throw new Error('Notification not found or does not belong to user');
    }

    // Если изменились schedule или parameters, пересчитываем nextNotificationAt
    let nextNotificationAt = notification.nextNotificationAt;
    if (data.schedule || data.parameters) {
      const schedule = data.schedule || notification.schedule;
      const parameters = (data.parameters || notification.parameters) as NotificationParams;
      nextNotificationAt = this.calculateNextNotification(schedule, parameters);
    }

    // Обновляем уведомление
    const updateData: any = {
      ...data,
      nextNotificationAt,
    };

    if (data.parameters) {
      updateData.parameters = data.parameters as any;
    }

    return this.notificationRepo.update(notificationId, updateData);
  }

  /**
   * Удалить уведомление
   */
  async deleteNotification(
    notificationId: number,
    userId: string | number
  ): Promise<void> {
    const notification = await this.notificationRepo.findByIdAndUserId(
      notificationId,
      typeof userId === 'string' 
        ? await this.getUserInternalId(userId)
        : userId
    );

    if (!notification) {
      throw new Error('Notification not found or does not belong to user');
    }

    await this.notificationRepo.delete(notificationId);
  }

  /**
   * Получить все уведомления пользователя
   */
  async getUserNotifications(
    userId: string | number
  ): Promise<Notification[]> {
    const internalUserId = typeof userId === 'string' 
      ? await this.getUserInternalId(userId)
      : userId;

    return this.notificationRepo.findByUserId(internalUserId);
  }

  /**
   * Включить/выключить уведомление
   */
  async toggleNotification(
    notificationId: number,
    userId: string | number,
    enabled: boolean
  ): Promise<Notification> {
    const notification = await this.notificationRepo.findByIdAndUserId(
      notificationId,
      typeof userId === 'string' 
        ? await this.getUserInternalId(userId)
        : userId
    );

    if (!notification) {
      throw new Error('Notification not found or does not belong to user');
    }

    return this.notificationRepo.setEnabled(notificationId, enabled);
  }

  /**
   * Обработать уведомления, которые нужно отправить
   * 
   * Этот метод вызывается планировщиком (cron) для проверки и отправки уведомлений
   */
  async processNotifications(now: Date = new Date()): Promise<{
    processed: number;
    sent: number;
    errors: number;
  }> {
    const notifications = await this.notificationRepo.findActiveDue(now);
    
    let processed = 0;
    let sent = 0;
    let errors = 0;

    for (const notification of notifications) {
      processed++;

      try {
        const checkResult = await this.checkNotification(notification, now);

        if (checkResult.shouldNotify) {
          // Здесь должна быть отправка уведомления через transport layer
          // Пока просто логируем
          logger.info(
            `NotificationService: Should notify user ${notification.user.telegramId} ` +
            `about notification ${notification.id} (${notification.subtype}): ${checkResult.reason}`
          );

          // Обновляем параметры с новым состоянием (для weather events)
          const updatedParams = await this.updateNotificationParams(
            notification,
            checkResult
          );

          // Обновляем время следующего уведомления
          const nextNotificationAt = checkResult.nextCheckAt || 
            this.calculateNextNotification(
              notification.schedule,
              updatedParams || (notification.parameters as NotificationParams)
            );

          await this.notificationRepo.update(notification.id, {
            nextNotificationAt,
            lastCheckedAt: now,
            parameters: updatedParams || notification.parameters,
          });

          sent++;
        } else {
          // Обновляем параметры даже если не отправляем (для сохранения состояния)
          const updatedParams = await this.updateNotificationParams(
            notification,
            checkResult
          );

          // Обновляем время следующей проверки без отправки
          const updateData: any = {
            lastCheckedAt: now,
          };

          if (checkResult.nextCheckAt) {
            updateData.nextNotificationAt = checkResult.nextCheckAt;
          }

          if (updatedParams) {
            updateData.parameters = updatedParams;
          }

          await this.notificationRepo.update(notification.id, updateData);
        }
      } catch (error) {
        errors++;
        logger.error(
          `NotificationService: Error processing notification ${notification.id}:`,
          error
        );
      }
    }

    return { processed, sent, errors };
  }

  /**
   * Проверить, нужно ли отправить уведомление
   */
  private async checkNotification(
    notification: Notification & { user: { telegramId: string }; location: any },
    now: Date
  ): Promise<NotificationCheckResult & { newParams?: NotificationParams }> {
    const params = notification.parameters as NotificationParams;

    // Для регулярных прогнозов - проверяем расписание
    if (notification.type === 'REGULAR_FORECAST') {
      return this.checkRegularForecast(notification, params as RegularForecastParams, now);
    }

    // Для погодных событий - проверяем условия
    if (notification.type === 'WEATHER_EVENT') {
      return this.checkWeatherEvent(
        notification,
        params,
        notification.subtype,
        now
      );
    }

    return { shouldNotify: false };
  }

  /**
   * Обновить параметры уведомления с новым состоянием
   */
  private async updateNotificationParams(
    notification: Notification,
    checkResult: NotificationCheckResult & { newParams?: NotificationParams }
  ): Promise<any | null> {
    if (checkResult.newParams) {
      return checkResult.newParams as any;
    }
    return null;
  }

  /**
   * Проверить регулярный прогноз
   */
  private checkRegularForecast(
    notification: Notification,
    params: RegularForecastParams,
    now: Date
  ): NotificationCheckResult {
    // Для регулярных прогнозов просто проверяем, что время пришло
    // Расписание уже проверено в findActiveDue
    return {
      shouldNotify: true,
      reason: 'Scheduled forecast notification',
      nextCheckAt: this.calculateNextNotification(
        notification.schedule,
        params
      ),
    };
  }

  /**
   * Проверить погодное событие
   */
  private async checkWeatherEvent(
    notification: Notification & { user: { telegramId: string }; location: any },
    params: NotificationParams,
    subtype: string,
    now: Date
  ): Promise<NotificationCheckResult & { newParams?: NotificationParams }> {
    try {
      // Получаем текущую погоду для локации
      const locationId = notification.locationId || undefined;
      const weatherResult = await this.weatherService.getCurrentWeatherForUser(
        notification.user.telegramId,
        locationId
      );

      const weather = weatherResult.weather;

      // Проверяем в зависимости от подтипа
      switch (subtype) {
        case 'temperature_change':
          return this.checkTemperatureEvent(
            params as TemperatureEventParams,
            weather.temperature,
            notification.lastCheckedAt
          );

        case 'precipitation':
          return this.checkPrecipitationEvent(
            params as PrecipitationEventParams,
            weather,
            notification.lastCheckedAt
          );

        case 'wind':
          return this.checkWindEvent(
            params as WindEventParams,
            weather.windSpeed,
            notification.lastCheckedAt
          );

        default:
          return { shouldNotify: false };
      }
    } catch (error) {
      logger.error(
        `NotificationService: Error checking weather event for notification ${notification.id}:`,
        error
      );
      return { shouldNotify: false };
    }
  }

  /**
   * Проверить событие изменения температуры
   */
  private checkTemperatureEvent(
    params: TemperatureEventParams,
    currentTemp: number,
    lastCheckedAt: Date | null
  ): NotificationCheckResult & { newParams?: TemperatureEventParams } {
    // Если это первая проверка, сохраняем текущую температуру
    if (!lastCheckedAt || params.lastTemperature === undefined) {
      return {
        shouldNotify: false,
        nextCheckAt: this.addHours(new Date(), params.checkIntervalHours),
        newParams: {
          ...params,
          lastTemperature: currentTemp,
        },
      };
    }

    const tempDiff = currentTemp - params.lastTemperature;
    let shouldNotify = false;
    let reason = '';

    switch (params.direction) {
      case 'increase':
        shouldNotify = tempDiff >= params.threshold;
        reason = shouldNotify
          ? `Temperature increased by ${tempDiff.toFixed(1)}°C (threshold: ${params.threshold}°C)`
          : '';
        break;

      case 'decrease':
        shouldNotify = tempDiff <= -params.threshold;
        reason = shouldNotify
          ? `Temperature decreased by ${Math.abs(tempDiff).toFixed(1)}°C (threshold: ${params.threshold}°C)`
          : '';
        break;

      case 'any':
        shouldNotify = Math.abs(tempDiff) >= params.threshold;
        reason = shouldNotify
          ? `Temperature changed by ${Math.abs(tempDiff).toFixed(1)}°C (threshold: ${params.threshold}°C)`
          : '';
        break;
    }

    return {
      shouldNotify,
      reason,
      nextCheckAt: this.addHours(new Date(), params.checkIntervalHours),
      newParams: {
        ...params,
        lastTemperature: currentTemp,
      },
    };
  }

  /**
   * Проверить событие осадков
   */
  private checkPrecipitationEvent(
    params: PrecipitationEventParams,
    weather: any, // CurrentWeather
    lastCheckedAt: Date | null
  ): NotificationCheckResult & { newParams?: PrecipitationEventParams } {
    // Определяем, есть ли осадки сейчас
    const hasPrecipitation = this.hasPrecipitation(weather);

    // Если это первая проверка, сохраняем состояние
    if (!lastCheckedAt || params.lastPrecipitationState === undefined) {
      return {
        shouldNotify: false,
        nextCheckAt: this.addHours(new Date(), params.checkIntervalHours),
        newParams: {
          ...params,
          lastPrecipitationState: hasPrecipitation,
        },
      };
    }

    let shouldNotify = false;
    let reason = '';

    if (params.eventType === 'start') {
      // Уведомление при начале осадков
      shouldNotify = hasPrecipitation && !params.lastPrecipitationState;
      reason = shouldNotify
        ? `Precipitation started (${params.precipitationType})`
        : '';
    } else {
      // Уведомление при окончании осадков
      shouldNotify = !hasPrecipitation && params.lastPrecipitationState;
      reason = shouldNotify ? 'Precipitation ended' : '';
    }

    return {
      shouldNotify,
      reason,
      nextCheckAt: this.addHours(new Date(), params.checkIntervalHours),
      newParams: {
        ...params,
        lastPrecipitationState: hasPrecipitation,
      },
    };
  }

  /**
   * Проверить событие ветра
   */
  private checkWindEvent(
    params: WindEventParams,
    currentWindSpeed: number,
    lastCheckedAt: Date | null
  ): NotificationCheckResult {
    const shouldNotify = currentWindSpeed >= params.threshold;

    return {
      shouldNotify,
      reason: shouldNotify
        ? `Wind speed ${currentWindSpeed.toFixed(1)} m/s exceeds threshold ${params.threshold} m/s`
        : undefined,
      nextCheckAt: this.addHours(new Date(), params.checkIntervalHours),
    };
  }

  /**
   * Проверить, есть ли осадки
   */
  private hasPrecipitation(weather: any): boolean {
    const condition = weather.condition?.toLowerCase() || '';
    const description = weather.description?.toLowerCase() || '';

    const hasRain = condition.includes('rain') || description.includes('дожд');
    const hasSnow = condition.includes('snow') || description.includes('снег');

    return hasRain || hasSnow;
  }

  /**
   * Вычислить время следующего уведомления
   */
  private calculateNextNotification(
    schedule: ScheduleType,
    parameters: NotificationParams
  ): Date | null {
    const now = new Date();
    const params = parameters as RegularForecastParams;

    switch (schedule) {
      case 'DAILY': {
        // Ежедневно в указанное время
        const time = params.time || '09:00';
        const [hours, minutes] = time.split(':').map(Number);
        const next = new Date(now);
        next.setHours(hours, minutes, 0, 0);

        // Если время уже прошло сегодня, планируем на завтра
        if (next <= now) {
          next.setDate(next.getDate() + 1);
        }

        return next;
      }

      case 'WEEKDAYS': {
        // Только будни (пн-пт)
        const time = params.time || '09:00';
        const [hours, minutes] = time.split(':').map(Number);
        const next = new Date(now);
        next.setHours(hours, minutes, 0, 0);

        // Если сегодня выходной, планируем на следующий понедельник
        const dayOfWeek = next.getDay();
        if (dayOfWeek === 0) {
          // Воскресенье
          next.setDate(next.getDate() + 1);
        } else if (dayOfWeek === 6) {
          // Суббота
          next.setDate(next.getDate() + 2);
        } else if (next <= now) {
          // Если время прошло, планируем на завтра (если будний день)
          next.setDate(next.getDate() + 1);
          if (next.getDay() === 0) {
            next.setDate(next.getDate() + 1); // Понедельник
          } else if (next.getDay() === 6) {
            next.setDate(next.getDate() + 2); // Понедельник
          }
        }

        return next;
      }

      case 'WEEKENDS': {
        // Только выходные (сб-вс)
        const time = params.time || '09:00';
        const [hours, minutes] = time.split(':').map(Number);
        const next = new Date(now);
        next.setHours(hours, minutes, 0, 0);

        const dayOfWeek = next.getDay();
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          // Будний день - планируем на ближайшие выходные
          const daysUntilWeekend = dayOfWeek === 5 ? 1 : 6 - dayOfWeek;
          next.setDate(next.getDate() + daysUntilWeekend);
        } else if (next <= now) {
          // Если время прошло, планируем на следующие выходные
          next.setDate(next.getDate() + 7);
        }

        return next;
      }

      case 'ONCE': {
        // Один раз в указанную дату
        if (params.targetDate) {
          const target = new Date(params.targetDate);
          const time = params.time || '09:00';
          const [hours, minutes] = time.split(':').map(Number);
          target.setHours(hours, minutes, 0, 0);

          // Если дата уже прошла, возвращаем null (не планируем)
          if (target <= now) {
            return null;
          }

          return target;
        }

        return null;
      }

      default:
        return null;
    }
  }

  /**
   * Добавить часы к дате
   */
  private addHours(date: Date, hours: number): Date {
    const result = new Date(date);
    result.setHours(result.getHours() + hours);
    return result;
  }

  /**
   * Получить внутренний ID пользователя по telegram_id
   */
  private async getUserInternalId(telegramId: string): Promise<number> {
    const user = await this.userRepo.findByTelegramId(telegramId);
    if (!user) {
      throw new UserNotFoundError(telegramId);
    }
    return user.id;
  }
}

