/**
 * Locations API Routes
 * 
 * REST API endpoints для управления локациями пользователя
 */

import { Router, Request, Response } from 'express';
import { LocationRepository } from '../../storage/prisma/repositories';
import { logger } from '../../shared/utils/logger';

const router = Router();
const locationRepo = new LocationRepository();

/**
 * GET /api/locations - получить все локации пользователя
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const locations = await locationRepo.findByUserId(userId);
    
    res.json(locations.map(loc => ({
      id: String(loc.id),
      name: loc.name,
      lat: loc.latitude,
      lon: loc.longitude,
      country: loc.countryCode || undefined
    })));
  } catch (error) {
    logger.error('Error fetching locations:', error);
    throw error;
  }
});

/**
 * POST /api/locations - добавить локацию
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { name, lat, lon, country } = req.body;
    
    if (!name || lat === undefined || lon === undefined) {
      return res.status(400).json({ error: 'Missing required fields: name, lat, lon' });
    }
    
    const location = await locationRepo.create({
      name,
      latitude: lat,
      longitude: lon,
      countryCode: country || null,
      user: { connect: { id: userId } }
    });
    
    res.status(201).json({
      id: String(location.id),
      name: location.name,
      lat: location.latitude,
      lon: location.longitude,
      country: location.countryCode || undefined
    });
  } catch (error) {
    logger.error('Error creating location:', error);
    throw error;
  }
});

/**
 * GET /api/locations/:id - получить локацию по ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const locationId = parseInt(req.params.id);
    
    if (isNaN(locationId)) {
      return res.status(400).json({ error: 'Invalid location ID' });
    }
    
    const location = await locationRepo.findById(locationId);
    
    if (!location || location.userId !== userId) {
      return res.status(404).json({ error: 'Location not found' });
    }
    
    res.json({
      id: String(location.id),
      name: location.name,
      lat: location.latitude,
      lon: location.longitude,
      country: location.countryCode || undefined
    });
  } catch (error) {
    logger.error('Error fetching location:', error);
    throw error;
  }
});

/**
 * DELETE /api/locations/:id - удалить локацию
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const locationId = parseInt(req.params.id);
    
    if (isNaN(locationId)) {
      return res.status(400).json({ error: 'Invalid location ID' });
    }
    
    const location = await locationRepo.findById(locationId);
    
    if (!location || location.userId !== userId) {
      return res.status(404).json({ error: 'Location not found' });
    }
    
    await locationRepo.delete(locationId);
    
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting location:', error);
    throw error;
  }
});

export function registerLocationRoutes(apiRouter: Router): void {
  apiRouter.use('/locations', router);
}
