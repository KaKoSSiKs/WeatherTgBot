/**
 * HTTP API Server
 * 
 * Express сервер для Mini App.
 * Предоставляет REST API endpoints для:
 * - Локации пользователя
 * - Погода и прогнозы
 * - Уведомления
 * - Настройки
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import { registerLocationRoutes } from './routes/locations';
import { registerWeatherRoutes } from './routes/weather';
import { registerNotificationRoutes } from './routes/notifications';
import { registerSettingsRoutes } from './routes/settings';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import { logger } from '../shared/utils/logger';
import { appConfig } from '../config';

/**
 * Создать и настроить HTTP API сервер
 */
export async function createApiServer(): Promise<Express> {
  const app = express();
  
  // Middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Telegram-Init-Data');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Логирование запросов
  app.use((req: Request, res: Response, next: NextFunction) => {
    logger.debug(`${req.method} ${req.path}`);
    next();
  });
  
  // Health check
  app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  
  // API routes (с аутентификацией)
  const apiRouter = express.Router();
  apiRouter.use(authMiddleware);
  
  registerLocationRoutes(apiRouter);
  registerWeatherRoutes(apiRouter);
  registerNotificationRoutes(apiRouter);
  registerSettingsRoutes(apiRouter);
  
  app.use('/api', apiRouter);
  
  // Error handling
  app.use(errorHandler);
  
  return app;
}

/**
 * Запустить API сервер
 */
export async function startApiServer(app: Express, port: number = 3001): Promise<void> {
  return new Promise((resolve) => {
    app.listen(port, () => {
      logger.info(`API Server started on port ${port}`);
      resolve();
    });
  });
}
