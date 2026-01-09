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
import { getNoCitiesKeyboard } from '../keyboards/currentWeather';
import { SettingsCallback } from '../keyboards/callback_data';
import { Markup } from 'telegraf';
import { logger } from '../../shared/utils/logger';

/**
 * Обработать ошибку и вернуть сообщение пользователю
 * @returns Сообщение об ошибке или пустая строка, если ошибка уже обработана
 */
export function handleError(ctx: Context, error: unknown): string {
  logger.error('Error in bot handler:', error);
  
  if (error instanceof UserNotFoundError) {
    return '❌ Пользователь не найден.\n\nИспользуйте /start для регистрации.';
  }
  
  if (error instanceof LocationNotSetError) {
    // Возвращаем специальное сообщение с клавиатурой для добавления города
    const message = '❌ Локация не установлена.\n\nДобавьте город, чтобы получать прогнозы погоды.';
    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('➕ Добавить город', SettingsCallback.create('cities', 'add', '0'))
      ],
      [
        Markup.button.callback('⚙️ Настройки', SettingsCallback.create('main', 'show'))
      ],
      [
        Markup.button.callback('🏠 Главное меню', 'nav:main_menu')
      ]
    ]);
    
    // Отправляем сообщение с клавиатурой
    ctx.reply(message, keyboard).catch((err) => {
      logger.error('Failed to send location error message:', err);
    });
    
    // Возвращаем пустую строку, чтобы не отправлять сообщение дважды
    return '';
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
    // handleError уже отправляет сообщение с клавиатурой для LocationNotSetError
    if (message) {
      await ctx.reply(message).catch((err) => {
        logger.error('Failed to send error message:', err);
      });
    }
  }
}

