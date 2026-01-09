/**
 * Weather Handler
 * 
 * Обработчик callback'ов для погоды.
 */

import type { Context } from 'telegraf';
import type { WeatherService } from '../../services/weather';
import { WeatherCallback } from '../keyboards/callback_data';
import { formatCurrentWeather } from '../formatters/weather.formatter';
import { getCitySelectionKeyboard, getNoCitiesKeyboard, getCurrentWeatherKeyboard } from '../keyboards/currentWeather';
import { LocationRepository } from '../../storage/prisma/repositories/location.repository';
import { UserRepository } from '../../storage/prisma/repositories';
import { handleError } from './error.handler';
import { logger } from '../../shared/utils/logger';

/**
 * Обработчик callback'ов для погоды
 */
export async function handleWeatherCallback(
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
  const parsed = WeatherCallback.parse(data);
  
  if (!parsed) {
    return;
  }

  const telegramId = userId.toString();

  switch (parsed.action) {
    case 'refresh': {
      try {
        await ctx.sendChatAction('typing');
        const result = await weatherService.getCurrentWeatherForUser(telegramId);
        const message = formatCurrentWeather(result);
        await ctx.reply(message);
        logger.debug(`Weather refreshed for user ${telegramId}`);
      } catch (error) {
        const errorMessage = handleError(ctx, error);
        await ctx.reply(errorMessage);
      }
      break;
    }
    case 'change_city': {
      // Показываем список городов для выбора
      const userRepo = new UserRepository();
      const user = await userRepo.findByTelegramId(telegramId);
      
      if (!user) {
        await ctx.reply('❌ Пользователь не найден. Используйте /start для регистрации.');
        return;
      }
      
      const locationRepo = new LocationRepository();
      const locations = await locationRepo.findByUserId(user.id);
      
      if (locations.length === 0) {
        const text = `📍 Выбор города\n\nУ вас пока нет сохраненных городов.\n\nДобавьте город, чтобы получать прогнозы погоды.`;
        await ctx.editMessageText(text, getNoCitiesKeyboard(parsed.source || 'weather'));
      } else {
        const text = `📍 Выберите город:\n\nВыберите город для просмотра погоды:`;
        await ctx.editMessageText(text, getCitySelectionKeyboard(locations, parsed.source || 'weather'));
      }
      break;
    }
    
    case 'select_city': {
      // Выбран конкретный город - показываем погоду для него
      if (!parsed.cityId) {
        await ctx.reply('❌ Ошибка: не указан ID города.');
        return;
      }
      
      const locationId = parseInt(parsed.cityId);
      if (isNaN(locationId)) {
        await ctx.reply('❌ Ошибка: неверный ID города.');
        return;
      }
      
      try {
        await ctx.sendChatAction('typing');
        const result = await weatherService.getCurrentWeatherForUser(telegramId, locationId);
        const message = formatCurrentWeather(result);
        
        const userRepo = new UserRepository();
        const user = await userRepo.findByTelegramId(telegramId);
        
        if (user) {
          await ctx.reply(message, getCurrentWeatherKeyboard(locationId, user.id, true));
        } else {
          await ctx.reply(message);
        }
        
        logger.debug(`Weather sent to user ${telegramId} for location ${locationId}`);
      } catch (error) {
        const errorMessage = handleError(ctx, error);
        await ctx.reply(errorMessage);
      }
      break;
    }
    default:
      logger.warn(`Unknown weather action: ${parsed.action}`);
  }
}

