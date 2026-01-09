/**
 * Error Handler Middleware
 * 
 * Централизованная обработка ошибок для API.
 * Преобразует ошибки сервисов в HTTP ответы.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../../shared/utils/logger';
import { 
  UserNotFoundError, 
  LocationNotSetError 
} from '../../shared/errors/domain.errors';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  logger.error('API Error:', {
    path: req.path,
    method: req.method,
    error: err.message,
    stack: err.stack
  });
  
  // Обработка известных ошибок домена
  if (err instanceof UserNotFoundError) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  
  if (err instanceof LocationNotSetError) {
    res.status(404).json({ error: 'Location not set' });
    return;
  }
  
  // Обработка ошибок валидации
  if (err.name === 'ValidationError' || err.name === 'ZodError') {
    res.status(400).json({ 
      error: 'Validation error',
      details: err.errors || err.issues 
    });
    return;
  }
  
  // Обработка Prisma ошибок
  if (err.code === 'P2002') {
    res.status(409).json({ error: 'Resource already exists' });
    return;
  }
  
  if (err.code === 'P2025') {
    res.status(404).json({ error: 'Resource not found' });
    return;
  }
  
  // Общая ошибка сервера
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
}

