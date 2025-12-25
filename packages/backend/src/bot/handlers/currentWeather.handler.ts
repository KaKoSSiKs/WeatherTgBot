/**
 * Current Weather Handler
 * 
 * Обработчики для текущей погоды с выбором города.
 */

import type { Context } from 'telegraf';
import { UserRepository, LocationRepository, UserSettingsRepository } from '../../storage/prisma/repositories';
import { WeatherService } from '../../services/weather';
import { formatCurrentWeather } from '../formatters/weather.formatter';
import { getCurrentWeatherKeyboard, getCitySelectionKeyboard, getNoCitiesKeyboard, getErrorKeyboard } from '../keyboards/weather.keyboard';
import { WeatherCallback } from '../keyboards/callback-data';
import { logger } from '../../shared/utils/logger';
import { handleError } from './error.handler';

/**
 * Показать текущую погоду
 */
export async function showCurrentWeather(
  ctx: Context,
  weatherService: WeatherService,
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
      await handleNoCities(ctx, user.id);
      return;
    }

    // Определяем целевую локацию
    let targetLocation = locations[0];

    // Если локация не указана явно — пробуем взять основную из настроек
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

    // Показываем индикатор печати
    await ctx.sendChatAction('typing');

    // Получаем погоду через WeatherService
    const result = await weatherService.getCurrentWeatherForUser(telegramId, targetLocation.id);

    // Форматируем ответ
    const message = formatCurrentWeather(result);

    // Создаем клавиатуру
    const keyboard = getCurrentWeatherKeyboard(targetLocation.id, user.id, fromMenu);

    // Отправляем/редактируем сообщение
    if (ctx.callbackQuery) {
      try {
        await ctx.editMessageText(message, keyboard);
        await ctx.answerCbQuery();
      } catch (error: any) {
        // Если сообщение не изменилось или другая ошибка, отправляем новое
        if (error.description?.includes('message is not modified')) {
          await ctx.answerCbQuery();
          return;
        }
        await ctx.reply(message, keyboard);
      }
    } else {
      await ctx.reply(message, keyboard);
    }

    logger.debug(`User ${telegramId} viewed weather for ${targetLocation.name}`);

  } catch (error) {
    logger.error('Error in showCurrentWeather:', error);
    const errorMessage = handleError(ctx, error);
    await ctx.reply(errorMessage);
  }
}

/**
 * Обработка случая, когда у пользователя нет сохраненных городов
 */
async function handleNoCities(ctx: Context, userId: number): Promise<void> {
  try {
    const keyboard = getNoCitiesKeyboard(userId);
    const message = '📍 У вас пока нет сохраненных городов.\n\nДобавьте город, чтобы получать информацию о погоде.';

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
    logger.error('Error in handleNoCities:', error);
  }
}

/**
 * Показать выбор города
 */
export async function showCitySelection(
  ctx: Context,
  weatherService: WeatherService,
  returnTo: string = 'weather'
): Promise<void> {
  const telegramId = ctx.from?.id?.toString();
  if (!telegramId) return;

  try {
    const userRepo = new UserRepository();
    const locationRepo = new LocationRepository();
    
    const user = await userRepo.findByTelegramId(telegramId);
    if (!user) {
      await ctx.reply('❌ Пользователь не найден. Используйте /start для регистрации.');
      return;
    }

    // Получаем все локации пользователя
    const locations = await locationRepo.findByUserId(user.id);

    if (locations.length === 0) {
      await handleNoCities(ctx, user.id);
      return;
    }

    const keyboard = getCitySelectionKeyboard(
      locations.map(loc => ({ id: loc.id, name: loc.name })),
      user.id,
      returnTo
    );

    const message = '📍 Выберите город:';

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
    logger.error('Error in showCitySelection:', error);
    await ctx.reply('❌ Произошла ошибка при получении списка городов.');
  }
}

/**
 * Обработка обновления погоды
 */
export async function handleRefreshWeather(
  ctx: Context,
  weatherService: WeatherService,
  locationId: number
): Promise<void> {
  await showCurrentWeather(ctx, weatherService, locationId, false);
}

/**
 * Обработка выбора города
 */
export async function handleCitySelection(
  ctx: Context,
  weatherService: WeatherService,
  locationId: number,
  returnTo: string = 'weather'
): Promise<void> {
  await showCurrentWeather(ctx, weatherService, locationId, false);
}

/**
 * Регистрация обработчиков текущей погоды
 */
export function registerCurrentWeatherHandlers(
  bot: any,
  weatherService: WeatherService
): void {
  // Обработчик для кнопки "Текущая погода" из главного меню
  bot.action(/^menu:current_weather$/, async (ctx: Context) => {
    try {
      await ctx.answerCbQuery();
    } catch (error: any) {
      if (error.description?.includes('query is too old')) {
        return;
      }
    }
    await showCurrentWeather(ctx, weatherService, undefined, true);
  });

  // Обработчики для действий с погодой
  bot.action(/^weather:/, async (ctx: Context) => {
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
      await ctx.reply('Ошибка обработки запроса.');
      return;
    }

    const action = parsed.action;
    const locationId = parsed.locationId;
    const source = parsed.source || '';

    // Обрабатываем действие
    if (action === 'refresh' && locationId) {
      await handleRefreshWeather(ctx, weatherService, locationId);
    } else if (action === 'change_city') {
      await showCitySelection(ctx, weatherService, source || 'weather');
    } else if (action === 'select_city' && locationId) {
      await handleCitySelection(ctx, weatherService, locationId, source || 'weather');
    } else {
      logger.warn(`Unknown weather action: ${action}`);
      await ctx.reply('Неизвестное действие. Возвращаю в главное меню.');
    }
  });
}

