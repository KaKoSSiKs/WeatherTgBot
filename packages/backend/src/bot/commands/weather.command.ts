/**
 * Weather Command
 * 
 * Команда /weather - получение текущей погоды.
 */

import type { Context } from 'telegraf';
import type { WeatherService } from '../../services/weather';
import { formatCurrentWeather } from '../formatters/weather.formatter';
import { getCurrentWeatherKeyboard } from '../keyboards/currentWeather';
import { UserRepository } from '../../storage/prisma/repositories';
import { LocationRepository } from '../../storage/prisma/repositories/location.repository';
import { handleError } from '../handlers/error.handler';
import { logger } from '../../shared/utils/logger';

/**
 * Обработать команду /weather
 */
export async function handleWeatherCommand(
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
    
    // Получаем погоду через WeatherService
    const result = await weatherService.getCurrentWeatherForUser(telegramId);
    
    // Форматируем ответ
    const message = formatCurrentWeather(result);
    
    // Получаем пользователя для клавиатуры
    const userRepo = new UserRepository();
    const user = await userRepo.findByTelegramId(telegramId);
    
    if (user) {
      await ctx.reply(message, getCurrentWeatherKeyboard(result.location.id, user.id, true));
    } else {
      await ctx.reply(message);
    }
    
    logger.debug(`Weather sent to user ${telegramId}`);
    
  } catch (error) {
    const errorMessage = handleError(ctx, error);
    // handleError уже отправляет сообщение с клавиатурой для LocationNotSetError
    if (errorMessage) {
      await ctx.reply(errorMessage);
    }
  }
}

