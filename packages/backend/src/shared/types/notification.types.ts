/**
 * Notification Types
 * 
 * Типы для работы с уведомлениями.
 * Основаны на Prisma schema.
 */

import type { NotificationType, ScheduleType } from '@prisma/client';

/**
 * Параметры для регулярных прогнозов (REGULAR_FORECAST)
 */
export interface RegularForecastParams {
  time: string; // "HH:mm" - время отправки
  targetDate?: string; // "YYYY-MM-DD" - для ONCE schedule
}

/**
 * Параметры для события изменения температуры (WEATHER_EVENT: temperature_change)
 */
export interface TemperatureEventParams {
  direction: 'increase' | 'decrease' | 'any'; // Направление изменения
  threshold: number; // Порог изменения в °C
  checkIntervalHours: number; // Интервал проверки в часах
  lastTemperature?: number; // Последняя зафиксированная температура
}

/**
 * Параметры для события осадков (WEATHER_EVENT: precipitation)
 */
export interface PrecipitationEventParams {
  precipitationType: 'rain' | 'snow' | 'any'; // Тип осадков
  eventType: 'start' | 'end'; // Начало или конец осадков
  checkIntervalHours: number; // Интервал проверки в часах
  lastPrecipitationState?: boolean; // Последнее состояние (были ли осадки)
}

/**
 * Параметры для события ветра (WEATHER_EVENT: wind)
 */
export interface WindEventParams {
  threshold: number; // Порог скорости ветра в м/с
  checkIntervalHours: number; // Интервал проверки в часах
}

/**
 * Объединенный тип параметров уведомления
 */
export type NotificationParams =
  | RegularForecastParams
  | TemperatureEventParams
  | PrecipitationEventParams
  | WindEventParams;

/**
 * Данные для создания уведомления
 */
export interface CreateNotificationData {
  userId: number;
  locationId?: number; // Если не указан, используется дефолтная локация
  type: NotificationType;
  subtype: string;
  schedule: ScheduleType;
  parameters: NotificationParams;
  customName?: string;
}

/**
 * Данные для обновления уведомления
 */
export interface UpdateNotificationData {
  locationId?: number;
  type?: NotificationType;
  subtype?: string;
  schedule?: ScheduleType;
  parameters?: NotificationParams;
  customName?: string;
  enabled?: boolean;
}

/**
 * Результат проверки уведомления
 */
export interface NotificationCheckResult {
  shouldNotify: boolean; // Нужно ли отправить уведомление
  reason?: string; // Причина отправки (для логирования)
  nextCheckAt?: Date; // Время следующей проверки
}
