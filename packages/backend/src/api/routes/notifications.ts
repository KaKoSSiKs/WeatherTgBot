/**
 * Notifications API Routes
 * 
 * REST API endpoints для управления уведомлениями
 */

import { Router, Request, Response } from 'express';
import { NotificationService } from '../../services/notification/notification.service';
import { NotificationRepository } from '../../storage/prisma/repositories';
import { UserSettingsRepository } from '../../storage/prisma/repositories/user-settings.repository';
import { LocationRepository } from '../../storage/prisma/repositories/location.repository';
import { WeatherService } from '../../services/weather/weather.service';
import { OpenWeatherProvider } from '../../integrations/weather';
import { appConfig } from '../../config';
import { logger } from '../../shared/utils/logger';

const router = Router();

// Создаем сервисы (можно вынести в DI контейнер)
const apiKey = appConfig.WEATHER_API_KEY || appConfig.OPENWEATHER_API_KEY || '';
const weatherProvider = new OpenWeatherProvider(apiKey);
const weatherService = new WeatherService(weatherProvider);
const notificationRepo = new NotificationRepository();
const settingsRepo = new UserSettingsRepository();
const locationRepo = new LocationRepository();
const notificationService = new NotificationService(
  notificationRepo,
  settingsRepo,
  locationRepo,
  weatherService,
  appConfig.TZ
);

/**
 * GET /api/notifications - получить все уведомления
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const notifications = await notificationService.getUserNotifications(userId);
    
    res.json(notifications.map(notif => ({
      id: String(notif.id),
      name: notif.customName || `${notif.type} - ${notif.subtype}`,
      enabled: notif.enabled,
      type: notif.schedule.toLowerCase() as 'daily' | 'once' | 'weekdays',
      time: (notif.parameters as any)?.time || '08:00',
      placeId: String(notif.locationId || ''),
      triggers: extractTriggers(notif)
    })));
  } catch (error) {
    logger.error('Error fetching notifications:', error);
    throw error;
  }
});

/**
 * POST /api/notifications - создать уведомление
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { name, type, time, placeId, triggers } = req.body;
    
    if (!placeId) {
      return res.status(400).json({ error: 'Missing placeId' });
    }
    
    const locationId = parseInt(placeId);
    if (isNaN(locationId)) {
      return res.status(400).json({ error: 'Invalid placeId' });
    }
    
    // Определяем тип подписки и параметры
    const subscriptionType = triggers && triggers.length > 0 ? 'weather_event' : 'regular_forecast';
    let subtype = 'current';
    let parameters: any = { time: time || '08:00' };
    
    if (subscriptionType === 'weather_event' && triggers && triggers.length > 0) {
      const trigger = triggers[0];
      if (trigger === 'temp_drop' || trigger === 'temp_rise') {
        subtype = 'temperature_change';
        parameters = {
          direction: trigger === 'temp_drop' ? 'decrease' : 'increase',
          threshold: 5,
          checkIntervalHours: 3
        };
      } else if (trigger === 'rain') {
        subtype = 'precipitation';
        parameters = {
          precipitationType: 'rain',
          eventType: 'start',
          checkIntervalHours: 3
        };
      }
    }
    
    const notificationId = await notificationService.createNotification({
      userId,
      chatId: parseInt(req.user!.telegramId),
      locationId,
      subscriptionType,
      subtype,
      parameters,
      schedule: type || 'daily',
      customName: name
    });
    
    const notification = await notificationService.getNotificationById(notificationId);
    
    res.status(201).json({
      id: String(notification!.id),
      name: notification!.customName || `${notification!.type} - ${notification!.subtype}`,
      enabled: notification!.enabled,
      type: notification!.schedule.toLowerCase() as 'daily' | 'once' | 'weekdays',
      time: (notification!.parameters as any)?.time || '08:00',
      placeId: String(notification!.locationId || ''),
      triggers: extractTriggers(notification!)
    });
  } catch (error) {
    logger.error('Error creating notification:', error);
    throw error;
  }
});

/**
 * PATCH /api/notifications/:id/toggle - включить/выключить уведомление
 */
router.patch('/:id/toggle', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const notificationId = parseInt(req.params.id);
    const { enabled } = req.body;
    
    if (isNaN(notificationId)) {
      return res.status(400).json({ error: 'Invalid notification ID' });
    }
    
    const notification = await notificationService.getNotificationById(notificationId);
    
    if (!notification || notification.userId !== userId) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    await notificationService.toggleNotification(notificationId);
    
    const updated = await notificationService.getNotificationById(notificationId);
    
    res.json({
      id: String(updated!.id),
      enabled: updated!.enabled
    });
  } catch (error) {
    logger.error('Error toggling notification:', error);
    throw error;
  }
});

/**
 * DELETE /api/notifications/:id - удалить уведомление
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const notificationId = parseInt(req.params.id);
    
    if (isNaN(notificationId)) {
      return res.status(400).json({ error: 'Invalid notification ID' });
    }
    
    const notification = await notificationService.getNotificationById(notificationId);
    
    if (!notification || notification.userId !== userId) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    await notificationService.deleteNotification(notificationId);
    
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting notification:', error);
    throw error;
  }
});

/**
 * Извлекает триггеры из параметров уведомления
 */
function extractTriggers(notif: any): string[] {
  const params = notif.parameters || {};
  const triggers: string[] = [];
  
  if (notif.subtype === 'temperature_change') {
    if (params.direction === 'decrease') triggers.push('temp_drop');
    if (params.direction === 'increase') triggers.push('temp_rise');
  } else if (notif.subtype === 'precipitation') {
    if (params.precipitationType === 'rain') triggers.push('rain');
  }
  
  return triggers;
}

export function registerNotificationRoutes(apiRouter: Router): void {
  apiRouter.use('/notifications', router);
}
