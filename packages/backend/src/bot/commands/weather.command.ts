/**
 * Weather Command
 * 
 * Команда /weather - получение текущей погоды.
 * Поддерживает город в аргументах: /weather Москва
 * Тексты и поведение перенесены из старого бота (bot/).
 */

import type { Context } from 'telegraf';
import type { WeatherService } from '../../services/weather';
import { formatCurrentWeather, formatWeatherError } from '../formatters/weather.formatter';
import { handleError } from '../handlers/error.handler';
import { logger } from '../../shared/utils/logger';
import { geocodeCity } from '../../shared/utils/geocoding';
import { LocationRepository } from '../../storage/prisma/repositories';
import { UserRepository } from '../../storage/prisma/repositories';

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
    
    // Получаем текст команды и извлекаем название города (если есть)
    const fullText = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    const locationQuery = fullText.replace(/^\/weather\s*/i, '').trim();
    
    let locationLabel = 'указанного места';
    let result;
    
    // Если указан город в аргументах
    if (locationQuery.length > 0) {
      locationLabel = locationQuery;
      
      // Геокодим город
      const geocoded = geocodeCity(locationQuery);
      if (!geocoded) {
        await ctx.reply(formatWeatherError(locationQuery, 'city_not_found'));
        return;
      }
      
      // Получаем пользователя
      const userRepo = new UserRepository();
      const user = await userRepo.findByTelegramId(telegramId);
      if (!user) {
        await ctx.reply('❌ Пользователь не найден.\n\nИспользуйте /start для регистрации.');
        return;
      }
      
      // Проверяем, есть ли уже такая локация у пользователя
      const locationRepo = new LocationRepository();
      let location = await locationRepo.findByUserIdAndName(user.id, geocoded.name);
      
      // Если локации нет, создаем временную (или используем координаты напрямую)
      // Для простоты, создаем локацию, если её нет
      if (!location) {
        // Создаем локацию для пользователя
        location = await locationRepo.create({
          user: { connect: { id: user.id } },
          name: geocoded.name,
          latitude: geocoded.latitude,
          longitude: geocoded.longitude,
          countryCode: geocoded.countryCode || null,
        });
      }
      
      // Получаем погоду для этой локации
      result = await weatherService.getCurrentWeatherForUser(telegramId, location.id);
    } else {
      // Используем дефолтную локацию пользователя
      result = await weatherService.getCurrentWeatherForUser(telegramId);
      locationLabel = result.location.name;
    }
    
    // Форматируем ответ
    const message = formatCurrentWeather(result);
    
    await ctx.reply(message);
    
    logger.debug(`Weather sent to user ${telegramId} for ${locationLabel}`);
    
  } catch (error) {
    logger.error('Error in /weather command:', error);
    const errorMessage = handleError(ctx, error);
    await ctx.reply(errorMessage);
  }
}

