/**
 * Forecast Handler
 * 
 * Обработчики для прогнозов погоды (1, 3, 7, 10 дней).
 */

import type { Context } from 'telegraf';
import { UserRepository, LocationRepository, UserSettingsRepository } from '../../storage/prisma/repositories';
import { WeatherService } from '../../services/weather';
import { formatForecast } from '../formatters/forecast.formatter';
import { ForecastCallback } from '../keyboards/callback-data';
import { getNoCitiesKeyboard } from '../keyboards/weather.keyboard';
import { logger } from '../../shared/utils/logger';
import { handleError } from './error.handler';

/**
 * Показать прогноз
 */
export async function showForecast(
  ctx: Context,
  weatherService: WeatherService,
  forecastType: string,
  locationId?: number,
  fromMenu: boolean = true
): Promise<void> {
  const telegramId = ctx.from?.id?.toString();
  if (!telegramId) return;

  try {
    const userRepo = new UserRepository();
    const locationRepo = new LocationRepository();
    const settingsRepo = new UserSettingsRepository();
    
    const user = await userRepo.findByTelegramId(telegramId);
    if (!user) {
      await ctx.reply('❌ Пользователь не найден. Используйте /start для регистрации.');
      return;
    }

    // Получаем все локации пользователя
    const locations = await locationRepo.findByUserId(user.id);

    // Если нет сохраненных городов
    if (locations.length === 0) {
      await handleNoCitiesForecast(ctx, user.id);
      return;
    }

    // Определяем целевую локацию
    let targetLocation = locations[0];

    if (!locationId) {
      const settings = await settingsRepo.findByUserId(user.id);
      if (settings?.defaultCityId) {
        const foundDefault = locations.find((loc) => loc.id === settings.defaultCityId);
        if (foundDefault) {
          targetLocation = foundDefault;
        }
      }
    } else {
      const found = locations.find((loc) => loc.id === locationId);
      if (found) {
        targetLocation = found;
      }
    }

    // Определяем количество дней
    const daysMap: Record<string, number> = {
      'day': 1,
      '3day': 3,
      '7day': 7,
      '10day': 10,
    };
    const days = daysMap[forecastType] || 5;

    // Показываем индикатор печати
    await ctx.sendChatAction('typing');

    // Получаем прогноз через WeatherService
    const result = await weatherService.getForecastForUser(telegramId, days, targetLocation.id);

    // Форматируем ответ
    const message = formatForecast(result);

    // Создаем клавиатуру
    const { getForecastKeyboard } = await import('../keyboards');
    const keyboard = getForecastKeyboard(targetLocation.id, user.id, forecastType);

    // Отправляем/редактируем сообщение
    if (ctx.callbackQuery) {
      try {
        await ctx.editMessageText(message, keyboard);
        await ctx.answerCbQuery();
      } catch (error: any) {
        if (error.description?.includes('message is not modified')) {
          await ctx.answerCbQuery();
          return;
        }
        // Если не удалось отредактировать, отправляем новое сообщение
        await ctx.reply(message, keyboard);
      }
    } else {
      await ctx.reply(message, keyboard);
    }

    logger.debug(`User ${telegramId} viewed ${forecastType} forecast for ${targetLocation.name}`);

  } catch (error) {
    logger.error('Error in showForecast:', error);
    const errorMessage = handleError(ctx, error);
    await ctx.reply(errorMessage);
  }
}

/**
 * Обработка случая, когда у пользователя нет сохраненных городов (для прогноза)
 */
async function handleNoCitiesForecast(ctx: Context, userId: number): Promise<void> {
  try {
    const keyboard = getNoCitiesKeyboard(userId);
    const message = '📍 У вас пока нет сохраненных городов.\n\nДобавьте город, чтобы получать прогноз погоды.';

    if (ctx.callbackQuery) {
      try {
        await ctx.editMessageText(message, keyboard);
        await ctx.answerCbQuery();
      } catch (error: any) {
        if (error.description?.includes('message is not modified')) {
          await ctx.answerCbQuery();
          return;
        }
        await ctx.reply(message, keyboard);
      }
    } else {
      await ctx.reply(message, keyboard);
    }
  } catch (error) {
    logger.error('Error in handleNoCitiesForecast:', error);
  }
}

/**
 * Регистрация обработчиков прогнозов
 */
export function registerForecastHandlers(
  bot: any,
  weatherService: WeatherService
): void {
  // Обработчики для прогнозов из главного меню и других мест
  bot.action(/^forecast:/, async (ctx: Context) => {
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
      await ctx.reply('Ошибка обработки запроса.');
      return;
    }

    const forecastType = parsed.type;
    const locationId = parsed.locationId;
    const from = parsed.from || 'main_menu';

    await showForecast(ctx, weatherService, forecastType, locationId, from === 'main_menu');
  });
}

