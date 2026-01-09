/**
 * Authentication Middleware
 * 
 * Проверяет Telegram initData для аутентификации пользователей Mini App.
 * Извлекает telegram_id из валидного initData.
 */

import { Request, Response, NextFunction } from 'express';
import { UserRepository } from '../../storage/prisma/repositories';
import { logger } from '../../shared/utils/logger';

// Расширяем Request для добавления user
declare global {
  namespace Express {
    interface Request {
      user?: {
        telegramId: string;
        userId: number;
      };
    }
  }
}

/**
 * Простая валидация initData (в продакшене использовать @twa-dev/init-data-node)
 */
function parseInitData(initData: string): { user?: { id: string } } | null {
  try {
    const params = new URLSearchParams(initData);
    const userStr = params.get('user');
    if (!userStr) return null;
    const user = JSON.parse(userStr);
    return { user: { id: String(user.id) } };
  } catch {
    return null;
  }
}

/**
 * Middleware для аутентификации через Telegram initData
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Извлекаем initData из заголовка или query параметра
    const initData = req.headers['x-telegram-init-data'] as string || 
                     req.query.initData as string ||
                     req.body?.initData as string;
    
    if (!initData) {
      res.status(401).json({ error: 'Missing Telegram initData' });
      return;
    }
    
    // Парсим initData
    const parsed = parseInitData(initData);
    if (!parsed || !parsed.user) {
      res.status(401).json({ error: 'Invalid Telegram initData' });
      return;
    }
    
    const telegramId = parsed.user.id;
    
    // Находим или создаем пользователя
    const userRepo = new UserRepository();
    let user = await userRepo.findByTelegramId(telegramId);
    
    if (!user) {
      // Создаем нового пользователя
      const userData: any = {
        telegramId
      };
      if (parsed.user.first_name) userData.firstName = parsed.user.first_name;
      if (parsed.user.last_name) userData.lastName = parsed.user.last_name;
      if (parsed.user.username) userData.username = parsed.user.username;
      
      user = await userRepo.create(userData);
      logger.info(`Created new user from Mini App: ${telegramId}`);
    }
    
    // Добавляем пользователя в request
    req.user = {
      telegramId,
      userId: user.id
    };
    
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

