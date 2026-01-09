/**
 * Settings API Routes
 * 
 * REST API endpoints для настроек пользователя
 */

import { Router, Request, Response } from 'express';
import { UserSettingsRepository } from '../../storage/prisma/repositories';
import { logger } from '../../shared/utils/logger';

const router = Router();
const settingsRepo = new UserSettingsRepository();

/**
 * GET /api/settings - получить настройки пользователя
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const settings = await settingsRepo.findByUserId(userId);
    
    res.json({
      units: settings?.temperatureUnit?.toLowerCase() || 'metric',
      locale: settings?.language || 'ru',
      cityCount: 5 // TODO: добавить в настройки
    });
  } catch (error) {
    logger.error('Error fetching settings:', error);
    throw error;
  }
});

/**
 * PUT /api/settings - обновить настройки
 */
router.put('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { units, locale } = req.body;
    
    const settings = await settingsRepo.findByUserId(userId);
    
    if (settings) {
      await settingsRepo.update(settings.id, {
        temperatureUnit: units === 'imperial' ? 'FAHRENHEIT' : 'CELSIUS',
        language: locale || 'ru'
      });
    } else {
      await settingsRepo.create({
        user: { connect: { id: userId } },
        temperatureUnit: units === 'imperial' ? 'FAHRENHEIT' : 'CELSIUS',
        language: locale || 'ru'
      });
    }
    
    res.json({
      units: units || 'metric',
      locale: locale || 'ru',
      cityCount: 5
    });
  } catch (error) {
    logger.error('Error updating settings:', error);
    throw error;
  }
});

export function registerSettingsRoutes(apiRouter: Router): void {
  apiRouter.use('/settings', router);
}
