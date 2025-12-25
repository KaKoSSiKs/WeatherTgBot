/**
 * Forecast Command
 * 
 * Команда /forecast - получение прогноза погоды.
 */

import type { Context } from 'telegraf';
import type { WeatherService } from '../../services/weather';
import { formatForecast } from '../formatters/forecast.formatter';
import { handleError } from '../handlers/error.handler';
import { logger } from '../../shared/utils/logger';

/**
 * Обработать команду /forecast
 */
export async function handleForecastCommand(
  ctx: Context,
  weatherService: WeatherService
): Promise<void> {
  const telegramId = ctx.from?.id?.toString();
  
  if (!telegramId) {
    await ctx.reply('❌ Ошибка: не удалось определить ваш ID.');
    return;
  }
  
  try {
    // Показываем индикатор печати
    await ctx.sendChatAction('typing');
    
    // Получаем прогноз через WeatherService (5 дней по умолчанию)
    const result = await weatherService.getForecastForUser(telegramId, 5);
    
    // Форматируем ответ
    const message = formatForecast(result);
    
    await ctx.reply(message);
    
    logger.debug(`Forecast sent to user ${telegramId}`);
    
  } catch (error) {
    const errorMessage = handleError(ctx, error);
    await ctx.reply(errorMessage);
  }
}

