/**
 * Сервис уведомлений с планировщиком
 * Управляет созданием, отправкой и проверкой погодных уведомлений
 */

import type { Bot, Context } from 'grammy';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';
import { scheduleEveryMinute, type CronJobHandle } from '../scheduler/cron';
import {
  getCurrentWeatherByCoords,
  getDailyForecast,
  getDetailedDailyForecast,
  type DailyForecastData
} from './weatherService';
import {
  formatCurrentWeather,
  formatDailyForecastBrief,
  type WeatherData
} from './weatherFormatter';
import { notificationSentKeyboard } from '../keyboards/notifications';
import { DateTime } from 'luxon';

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
 * Получить отображаемое имя типа уведомления
 */
export function getDisplayType(subscriptionType: string, subtype: string): string {
  const typeMap: Record<string, Record<string, string>> = {
    regular_forecast: {
      current: '🌤️ Текущая погода',
      today: '📅 Прогноз на сегодня',
      tomorrow: '📆 Прогноз на завтра',
      '3day': '📅 Прогноз на 3 дня',
      '7day': '📅 Прогноз на 7 дней',
      '10day': '📅 Прогноз на 10 дней'
    },
    weather_event: {
      temperature_change: '🌡️ Изменение температуры',
      precipitation: '🌧️ Осадки',
      wind: '💨 Сильный ветер'
    }
  };

  return typeMap[subscriptionType]?.[subtype] || subtype;
}

/**
 * Получить отображаемое имя расписания
 */
export function getDisplaySchedule(schedule: string): string {
  const scheduleMap: Record<string, string> = {
    daily: 'Каждый день',
    weekdays: 'Только в будни',
    weekends: 'По выходным',
    once: 'Один раз'
  };

  return scheduleMap[schedule] || schedule;
}

/**
 * Парсить параметры из JSON строки
 */
export function parseParameters<T = NotificationParams>(paramsStr: string): T {
  try {
    return JSON.parse(paramsStr) as T;
  } catch {
    return {} as T;
  }
}

/**
 * Сериализовать параметры в JSON строку
 */
export function stringifyParameters(params: NotificationParams): string {
  return JSON.stringify(params);
}

/**
 * Рассчитать время следующего уведомления
 */
export function calculateNextNotification(
  subscriptionType: string,
  schedule: string,
  params: NotificationParams,
  timezone: string = 'Europe/Moscow'
): Date {
  const now = DateTime.now().setZone(timezone);

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
        const targetDateTime = DateTime.fromISO(forecastParams.targetDate).setZone(timezone);
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
 * Класс сервиса уведомлений
 */
export class NotificationService {
  private bot: Bot<Context>;
  private schedulerHandle: CronJobHandle | null = null;
  private timezone: string;

  constructor(bot: Bot<Context>, timezone: string = 'Europe/Moscow') {
    this.bot = bot;
    this.timezone = timezone;
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
      const nextNotification = calculateNextNotification(
        data.subscriptionType,
        data.schedule,
        data.parameters,
        this.timezone
      );

      const notification = await prisma.notification.create({
        data: {
          subscriptionType: data.subscriptionType,
          subtype: data.subtype,
          parameters: stringifyParameters(data.parameters),
          schedule: data.schedule,
          nextNotification,
          enabled: true,
          customName: data.customName || null,
          type: data.subscriptionType === 'regular_forecast' ? 'daily' : 'trigger',
          time: (data.parameters as RegularForecastParams).time || null,
          userId: data.userId,
          locationId: data.locationId
        }
      });

      logger(`Created notification ${notification.id} for user ${data.userId}`);
      return notification.id;
    } catch (error) {
      logger('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Получить все уведомления пользователя
   */
  async getUserNotifications(telegramId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { telegramId },
        include: {
          notifications: {
            include: { location: true },
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      return user?.notifications || [];
    } catch (error) {
      logger('Error getting user notifications:', error);
      return [];
    }
  }

  /**
   * Получить уведомление по ID
   */
  async getNotificationById(id: number) {
    try {
      return await prisma.notification.findUnique({
        where: { id },
        include: { location: true, user: true }
      });
    } catch (error) {
      logger('Error getting notification by id:', error);
      return null;
    }
  }

  /**
   * Переключить состояние уведомления (активно/приостановлено)
   */
  async toggleNotification(id: number): Promise<boolean> {
    try {
      const notification = await prisma.notification.findUnique({ where: { id } });
      if (!notification) return false;

      const newEnabled = !notification.enabled;
      let nextNotification: Date | null = null;

      if (newEnabled) {
        const params = parseParameters(notification.parameters);
        nextNotification = calculateNextNotification(
          notification.subscriptionType,
          notification.schedule,
          params,
          this.timezone
        );
      }

      await prisma.notification.update({
        where: { id },
        data: {
          enabled: newEnabled,
          nextNotification
        }
      });

      logger(`Toggled notification ${id} to ${newEnabled ? 'enabled' : 'disabled'}`);
      return true;
    } catch (error) {
      logger('Error toggling notification:', error);
      return false;
    }
  }

  /**
   * Удалить уведомление
   */
  async deleteNotification(id: number): Promise<boolean> {
    try {
      await prisma.notification.delete({ where: { id } });
      logger(`Deleted notification ${id}`);
      return true;
    } catch (error) {
      logger('Error deleting notification:', error);
      return false;
    }
  }

  /**
   * Обновить время следующего уведомления
   */
  async updateNextNotification(id: number): Promise<void> {
    try {
      const notification = await prisma.notification.findUnique({ where: { id } });
      if (!notification) return;

      const params = parseParameters(notification.parameters);
      const nextNotification = calculateNextNotification(
        notification.subscriptionType,
        notification.schedule,
        params,
        this.timezone
      );

      await prisma.notification.update({
        where: { id },
        data: {
          nextNotification,
          lastChecked: new Date()
        }
      });
    } catch (error) {
      logger('Error updating next notification:', error);
    }
  }

  /**
   * Отправить регулярный прогноз
   */
  async sendRegularForecast(notification: {
    id: number;
    subscriptionType: string;
    subtype: string;
    parameters: string;
    customName: string | null;
    location: { id: number; name: string; latitude: number; longitude: number } | null;
    user: { telegramId: string } | null;
  }): Promise<boolean> {
    try {
      if (!notification.location || !notification.user) {
        logger(`Notification ${notification.id} missing location or user`);
        return false;
      }

      const chatId = BigInt(notification.user.telegramId);
      const coords = {
        latitude: notification.location.latitude,
        longitude: notification.location.longitude
      };

      let message = '';
      const subtype = notification.subtype as ForecastSubtype;

      switch (subtype) {
        case 'current': {
          const result = await getCurrentWeatherByCoords(coords, notification.location.name);
          if (!result.data) {
            logger(`Failed to get current weather for notification ${notification.id}`);
            return false;
          }
          message = formatCurrentWeather(result.data, notification.location.name);
          break;
        }

        case 'today':
        case 'tomorrow': {
          const targetDate = subtype === 'today' 
            ? 'today' 
            : DateTime.now().setZone(this.timezone).plus({ days: 1 }).toISODate()!;
          
          const result = await getDetailedDailyForecast(
            coords,
            notification.location.name,
            targetDate,
            notification.location.id
          );
          
          if (!result.data) {
            logger(`Failed to get detailed forecast for notification ${notification.id}`);
            return false;
          }
          message = this.formatDetailedForecastMessage(result.data, notification.location.name);
          break;
        }

        case '3day':
        case '7day':
        case '10day': {
          const days = parseInt(subtype.replace('day', ''));
          const result = await getDailyForecast(
            coords,
            notification.location.name,
            days,
            notification.location.id
          );
          
          if (!result.data) {
            logger(`Failed to get daily forecast for notification ${notification.id}`);
            return false;
          }
          message = formatDailyForecastBrief(result.data, notification.location.name, days);
          break;
        }

        default:
          logger(`Unknown forecast subtype: ${subtype}`);
          return false;
      }

      // Добавляем заголовок
      const title = notification.customName || getDisplayType(notification.subscriptionType, notification.subtype);
      const now = DateTime.now().setZone(this.timezone);
      const fullMessage = `🔔 *${title}*\n\n${message}\n\n⏱️ ${now.toFormat('dd.MM.yyyy HH:mm')}`;

      // Отправляем сообщение
      await this.bot.api.sendMessage(chatId.toString(), fullMessage, {
        parse_mode: 'Markdown',
        reply_markup: notificationSentKeyboard(notification.id)
      });

      // Обновляем время следующего уведомления
      await this.updateNextNotification(notification.id);

      logger(`Sent regular forecast notification ${notification.id} to user ${notification.user.telegramId}`);
      return true;
    } catch (error) {
      logger(`Error sending regular forecast ${notification.id}:`, error);
      return false;
    }
  }

  /**
   * Форматирование детального прогноза для уведомления
   */
  private formatDetailedForecastMessage(forecast: DailyForecastData, cityName: string): string {
    const lines: string[] = [
      `📍 *${cityName}*`,
      `📅 ${forecast.dateStr}`,
      '',
      `${this.getWeatherEmoji(forecast.condition)} ${forecast.condition}`,
      `🌡️ ${forecast.tempMin.toFixed(0)}°...${forecast.tempMax.toFixed(0)}°C`,
      `💧 Влажность: ${forecast.humidity}%`,
      `💨 Ветер: ${forecast.windSpeed.toFixed(1)} м/с`
    ];

    if (forecast.warning && !forecast.warning.includes('нет')) {
      lines.push('', `⚠️ ${forecast.warning}`);
    }

    if (forecast.detailedRecommendation) {
      lines.push('', '👔 *Рекомендации:*', forecast.detailedRecommendation.split('\n').slice(0, 3).join('\n'));
    }

    return lines.join('\n');
  }

  /**
   * Проверить погодное событие
   */
  async checkWeatherEvent(notification: {
    id: number;
    subscriptionType: string;
    subtype: string;
    parameters: string;
    customName: string | null;
    location: { id: number; name: string; latitude: number; longitude: number } | null;
    user: { telegramId: string } | null;
  }): Promise<boolean> {
    try {
      if (!notification.location || !notification.user) {
        logger(`Notification ${notification.id} missing location or user`);
        return false;
      }

      const coords = {
        latitude: notification.location.latitude,
        longitude: notification.location.longitude
      };

      const weatherResult = await getCurrentWeatherByCoords(coords, notification.location.name);
      if (!weatherResult.data) {
        logger(`Failed to get weather for event check ${notification.id}`);
        return false;
      }

      const params = parseParameters(notification.parameters);
      const subtype = notification.subtype as EventSubtype;
      let eventTriggered = false;
      let eventMessage = '';

      switch (subtype) {
        case 'temperature_change': {
          const tempParams = params as TemperatureEventParams;
          const result = this.checkTemperatureEvent(weatherResult.data, tempParams, notification.location.name);
          eventTriggered = result.triggered;
          eventMessage = result.message;

          // Обновляем последнюю температуру
          if (result.triggered) {
            tempParams.lastTemperature = weatherResult.data.temp;
            await prisma.notification.update({
              where: { id: notification.id },
              data: { parameters: stringifyParameters(tempParams) }
            });
          }
          break;
        }

        case 'precipitation': {
          const precipParams = params as PrecipitationEventParams;
          const result = this.checkPrecipitationEvent(weatherResult.data, precipParams, notification.location.name);
          eventTriggered = result.triggered;
          eventMessage = result.message;

          // Обновляем состояние осадков
          precipParams.lastPrecipitationState = result.hasPrecipitation;
          await prisma.notification.update({
            where: { id: notification.id },
            data: { parameters: stringifyParameters(precipParams) }
          });
          break;
        }

        case 'wind': {
          const windParams = params as WindEventParams;
          const result = this.checkWindEvent(weatherResult.data, windParams, notification.location.name);
          eventTriggered = result.triggered;
          eventMessage = result.message;
          break;
        }

        default:
          logger(`Unknown event subtype: ${subtype}`);
          return false;
      }

      if (eventTriggered) {
        const chatId = notification.user.telegramId;
        const title = notification.customName || getDisplayType(notification.subscriptionType, notification.subtype);
        const now = DateTime.now().setZone(this.timezone);
        const fullMessage = `🔔 *${title}*\n\n${eventMessage}\n\n⏱️ Обнаружено: ${now.toFormat('dd.MM.yyyy HH:mm')}`;

        await this.bot.api.sendMessage(chatId, fullMessage, {
          parse_mode: 'Markdown',
          reply_markup: notificationSentKeyboard(notification.id)
        });

        logger(`Sent weather event notification ${notification.id} to user ${chatId}`);
      }

      // Обновляем время следующей проверки
      await this.updateNextNotification(notification.id);

      return eventTriggered;
    } catch (error) {
      logger(`Error checking weather event ${notification.id}:`, error);
      return false;
    }
  }

  /**
   * Проверка события изменения температуры
   */
  private checkTemperatureEvent(
    weather: WeatherData,
    params: TemperatureEventParams,
    cityName: string
  ): { triggered: boolean; message: string } {
    const currentTemp = weather.temp;
    const previousTemp = params.lastTemperature;

    if (previousTemp === undefined) {
      return { triggered: false, message: '' };
    }

    const change = currentTemp - previousTemp;
    const { direction, threshold } = params;

    let conditionMet = false;
    if (direction === 'decrease' && change <= -threshold) {
      conditionMet = true;
    } else if (direction === 'increase' && change >= threshold) {
      conditionMet = true;
    } else if (direction === 'any' && Math.abs(change) >= threshold) {
      conditionMet = true;
    }

    if (!conditionMet) {
      return { triggered: false, message: '' };
    }

    const changeAbs = Math.abs(change);
    const changeEmoji = change < 0 ? '↘️' : '↗️';
    const directionText = change < 0 ? 'Похолодание' : 'Потепление';

    const message = [
      `⚠️ *${directionText.toUpperCase()} В ${cityName.toUpperCase()}*`,
      '',
      `${changeEmoji} Температура изменилась на ${changeAbs.toFixed(1)}°C`,
      `Было: ${previousTemp.toFixed(1)}°C`,
      `Стало: ${currentTemp.toFixed(1)}°C`,
      '',
      `📌 Порог уведомления: ${threshold}°C`,
      '',
      `${this.getWeatherEmoji(weather.condition)} Сейчас: ${weather.condition}`,
      `🌡️ Температура: ${currentTemp.toFixed(1)}°C`,
      `💨 Ветер: ${weather.windSpeed?.toFixed(1) || 0} м/с`
    ].join('\n');

    return { triggered: true, message };
  }

  /**
   * Проверка события осадков
   */
  private checkPrecipitationEvent(
    weather: WeatherData,
    params: PrecipitationEventParams,
    cityName: string
  ): { triggered: boolean; message: string; hasPrecipitation: boolean } {
    const condition = weather.condition.toLowerCase();
    const hasPrecipitation = this.hasPrecipitation(condition, params.precipitationType);
    const hadPrecipitation = params.lastPrecipitationState ?? false;

    let conditionMet = false;
    if (params.eventType === 'start' && hasPrecipitation && !hadPrecipitation) {
      conditionMet = true;
    } else if (params.eventType === 'end' && !hasPrecipitation && hadPrecipitation) {
      conditionMet = true;
    }

    if (!conditionMet) {
      return { triggered: false, message: '', hasPrecipitation };
    }

    const eventText = params.eventType === 'start' ? 'начались' : 'закончились';
    const precipText = {
      rain: 'Дождь',
      snow: 'Снег',
      any: 'Осадки'
    }[params.precipitationType];

    const message = [
      `⚠️ *${precipText.toUpperCase()} ${eventText.toUpperCase()} В ${cityName.toUpperCase()}*`,
      '',
      `${this.getWeatherEmoji(weather.condition)} Погодные условия: ${weather.condition}`,
      `📌 Тип осадков: ${precipText}`,
      `🔄 Событие: ${eventText}`,
      '',
      `🌡️ Температура: ${weather.temp?.toFixed(1) || 0}°C`,
      `💨 Ветер: ${weather.windSpeed?.toFixed(1) || 0} м/с`
    ].join('\n');

    return { triggered: true, message, hasPrecipitation };
  }

  /**
   * Проверка события сильного ветра
   */
  private checkWindEvent(
    weather: WeatherData,
    params: WindEventParams,
    cityName: string
  ): { triggered: boolean; message: string } {
    const currentWind = weather.windSpeed || 0;

    if (currentWind < params.threshold) {
      return { triggered: false, message: '' };
    }

    let windStrength = 'сильный';
    if (currentWind >= 20) windStrength = 'очень сильный';
    else if (currentWind >= 25) windStrength = 'ураганный';

    let recommendations = '';
    if (currentWind >= 15) {
      recommendations = '\n\n💡 *Рекомендации:*\n• Будьте осторожны на улице\n• Уберите предметы с балконов\n• Избегайте парковки под деревьями';
    }

    const message = [
      `⚠️ *${windStrength.toUpperCase()} ВЕТЕР В ${cityName.toUpperCase()}*`,
      '',
      `💨 Скорость ветра: ${currentWind.toFixed(1)} м/с`,
      `📌 Порог уведомления: ${params.threshold} м/с`,
      `🚨 Превышение на ${(currentWind - params.threshold).toFixed(1)} м/с`,
      '',
      `${this.getWeatherEmoji(weather.condition)} Сейчас: ${weather.condition}`,
      `🌡️ Температура: ${weather.temp?.toFixed(1) || 0}°C`,
      recommendations
    ].join('\n');

    return { triggered: true, message };
  }

  /**
   * Проверка наличия осадков
   */
  private hasPrecipitation(condition: string, type: string): boolean {
    const rainWords = ['дождь', 'ливень', 'морось', 'rain', 'drizzle'];
    const snowWords = ['снег', 'метель', 'снегопад', 'snow', 'blizzard'];

    if (type === 'rain') {
      return rainWords.some(word => condition.includes(word));
    } else if (type === 'snow') {
      return snowWords.some(word => condition.includes(word));
    } else {
      return [...rainWords, ...snowWords].some(word => condition.includes(word));
    }
  }

  /**
   * Получить эмодзи погоды
   */
  private getWeatherEmoji(condition: string): string {
    const c = condition.toLowerCase();
    if (c.includes('ясно') || c.includes('солнц')) return '☀️';
    if (c.includes('облач') || c.includes('пасмурн')) return '☁️';
    if (c.includes('дождь') || c.includes('ливень')) return '🌧️';
    if (c.includes('снег') || c.includes('метель')) return '❄️';
    if (c.includes('гроза')) return '⛈️';
    if (c.includes('туман')) return '🌫️';
    return '🌤️';
  }

  /**
   * Проверить и отправить уведомления
   */
  async checkAndSendNotifications(): Promise<void> {
    try {
      const now = new Date();

      // Получаем уведомления, которые нужно отправить
      const notifications = await prisma.notification.findMany({
        where: {
          enabled: true,
          nextNotification: {
            lte: now
          }
        },
        include: {
          location: true,
          user: true
        }
      });

      if (notifications.length === 0) return;

      logger(`Found ${notifications.length} notifications to process`);

      for (const notification of notifications) {
        try {
          if (notification.subscriptionType === 'regular_forecast') {
            await this.sendRegularForecast(notification);
          } else {
            await this.checkWeatherEvent(notification);
          }
        } catch (error) {
          logger(`Error processing notification ${notification.id}:`, error);
          // Продолжаем с другими уведомлениями
        }
      }
    } catch (error) {
      logger('Error in checkAndSendNotifications:', error);
    }
  }

  /**
   * Запустить планировщик
   */
  startScheduler(): void {
    if (this.schedulerHandle) {
      logger('Scheduler already running');
      return;
    }

    this.schedulerHandle = scheduleEveryMinute(async () => {
      await this.checkAndSendNotifications();
    });

    logger('Notification scheduler started');
  }

  /**
   * Остановить планировщик
   */
  stopScheduler(): void {
    if (this.schedulerHandle) {
      this.schedulerHandle.stop();
      this.schedulerHandle = null;
      logger('Notification scheduler stopped');
    }
  }

  /**
   * Отправить тестовое уведомление
   */
  async sendTestNotification(notificationId: number): Promise<boolean> {
    try {
      const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
        include: { location: true, user: true }
      });

      if (!notification) {
        logger(`Notification ${notificationId} not found for test`);
        return false;
      }

      if (notification.subscriptionType === 'regular_forecast') {
        return await this.sendRegularForecast(notification);
      } else {
        // Для тестового уведомления события, принудительно отправляем
        return await this.sendEventTestNotification(notification);
      }
    } catch (error) {
      logger(`Error sending test notification ${notificationId}:`, error);
      return false;
    }
  }

  /**
   * Отправить тестовое уведомление о событии
   */
  private async sendEventTestNotification(notification: {
    id: number;
    subscriptionType: string;
    subtype: string;
    parameters: string;
    customName: string | null;
    location: { id: number; name: string; latitude: number; longitude: number } | null;
    user: { telegramId: string } | null;
  }): Promise<boolean> {
    if (!notification.location || !notification.user) {
      return false;
    }

    const coords = {
      latitude: notification.location.latitude,
      longitude: notification.location.longitude
    };

    const weatherResult = await getCurrentWeatherByCoords(coords, notification.location.name);
    if (!weatherResult.data) {
      return false;
    }

    const title = notification.customName || getDisplayType(notification.subscriptionType, notification.subtype);
    const now = DateTime.now().setZone(this.timezone);

    const message = [
      `🔔 *${title}* (тест)`,
      '',
      `📍 ${notification.location.name}`,
      '',
      `${this.getWeatherEmoji(weatherResult.data.condition)} ${weatherResult.data.condition}`,
      `🌡️ Температура: ${weatherResult.data.temp.toFixed(1)}°C`,
      `💨 Ветер: ${weatherResult.data.windSpeed?.toFixed(1) || 0} м/с`,
      `💧 Влажность: ${weatherResult.data.humidity}%`,
      '',
      `⏱️ ${now.toFormat('dd.MM.yyyy HH:mm')}`,
      '',
      '_Это тестовое уведомление_'
    ].join('\n');

    await this.bot.api.sendMessage(notification.user.telegramId, message, {
      parse_mode: 'Markdown',
      reply_markup: notificationSentKeyboard(notification.id)
    });

    return true;
  }
}

// Singleton instance
let notificationServiceInstance: NotificationService | null = null;

/**
 * Получить экземпляр сервиса уведомлений
 */
export function getNotificationService(bot?: Bot<Context>, timezone?: string): NotificationService {
  if (!notificationServiceInstance && bot) {
    notificationServiceInstance = new NotificationService(bot, timezone);
  }
  
  if (!notificationServiceInstance) {
    throw new Error('NotificationService not initialized. Provide bot instance first.');
  }
  
  return notificationServiceInstance;
}

