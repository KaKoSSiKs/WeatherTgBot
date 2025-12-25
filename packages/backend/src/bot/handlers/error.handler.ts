/**
 * Error Handler
 * 
 * Обработка ошибок для Telegram Bot.
 */

import type { Context } from 'telegraf';
import {
  UserNotFoundError,
  LocationNotSetError,
  LocationNotFoundError,
  LocationNotOwnedError,
} from '../../shared/errors/domain.errors';
import { WeatherError, WeatherErrorCode } from '../../shared/types/weather.types';
import { logger } from '../../shared/utils/logger';

/**
 * Обработать ошибку и вернуть сообщение пользователю
 */
export function handleError(ctx: Context, error: unknown): string {
  logger.error('Error in bot handler:', error);
  
  if (error instanceof UserNotFoundError) {
    return '❌ Пользователь не найден.\n\nИспользуйте /start для регистрации.';
  }
  
  if (error instanceof LocationNotSetError) {
    return '❌ Локация не установлена.\n\nДобавьте локацию перед запросом погоды.';
  }
  
  if (error instanceof LocationNotFoundError) {
    return '❌ Локация не найдена.';
  }
  
  if (error instanceof LocationNotOwnedError) {
    return '❌ Эта локация не принадлежит вам.';
  }
  
  if (error instanceof WeatherError) {
    return '❌ Не удалось получить погоду.\n\nПопробуйте позже.';
  }
  
  // Неизвестная ошибка
  return '❌ Произошла ошибка.\n\nПопробуйте позже или обратитесь в поддержку.';
}

/**
 * Middleware для обработки ошибок
 */
export async function errorHandlerMiddleware(
  ctx: Context,
  next: () => Promise<void>
): Promise<void> {
  try {
    await next();
  } catch (error) {
    const message = handleError(ctx, error);
    await ctx.reply(message).catch((err) => {
      logger.error('Failed to send error message:', err);
    });
  }
}

