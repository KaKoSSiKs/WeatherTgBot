/**
 * Forecast Handler
 * 
 * Обработчик callback'ов для прогнозов.
 */

import type { Context } from 'telegraf';
import type { WeatherService } from '../../services/weather';
import { ForecastCallback } from '../keyboards/callback_data';
import { formatForecast } from '../formatters/forecast.formatter';
import { handleError } from './error.handler';
import { logger } from '../../shared/utils/logger';

/**
 * Обработчик callback'ов для прогнозов
 */
export async function handleForecastCallback(
  ctx: Context,
  weatherService: WeatherService
): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  try {
    await ctx.answerCbQuery();
  } catch (error: any) {
    if (error.description?.includes('query is too old')) {
      return;
    }
  }

  const data = ctx.callbackQuery && 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : '';
  const parsed = ForecastCallback.parse(data);
  
  if (!parsed) {
    return;
  }

  const telegramId = userId.toString();

  try {
    await ctx.sendChatAction('typing');
    
    let days = 5; // По умолчанию 5 дней
    
    // Определяем количество дней по типу прогноза
    if (parsed.type === 'day') {
      days = 1;
    } else if (parsed.type === '3day') {
      days = 3;
    } else if (parsed.type === '7day') {
      days = 7;
    } else if (parsed.type === '10day') {
      days = 10;
    }
    
    const result = await weatherService.getForecastForUser(telegramId, days);
    const message = formatForecast(result);
    
    await ctx.reply(message);
    
    logger.debug(`Forecast sent to user ${telegramId}, type: ${parsed.type}, days: ${days}`);
  } catch (error) {
    const errorMessage = handleError(ctx, error);
    await ctx.reply(errorMessage);
  }
}

