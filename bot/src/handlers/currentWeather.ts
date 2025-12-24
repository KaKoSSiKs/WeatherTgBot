/**
 * Обработчики для сценария "Текущая погода".
 * Включает все кейсы из UX/UI дизайна.
 */

import type { Bot, Context } from 'grammy';
import { prisma } from '../db/prisma';
import { getOrCreateUser } from '../db/user';
import { logger } from '../utils/logger';
import { pushNavigationState } from '../utils/navigation';
import { WeatherCallback } from '../keyboards/callback_data';
import {
  getCurrentWeatherKeyboard,
  getCitySelectionKeyboard,
  getNoCitiesKeyboard,
  getErrorKeyboard
} from '../keyboards/currentWeather';
import {
  formatCurrentWeather,
  formatWeatherError,
  type WeatherData
} from '../services/weatherFormatter';
import {
  getCurrentWeatherByLocationId,
  refreshWeather
} from '../services/weatherService';
import { DEFAULT_CITY } from '../utils/geocoding';

async function getUserDisplaySettingsSafe(telegramId: string): Promise<Record<string, boolean> | undefined> {
  const prismaAny = prisma as any;
  try {
    const user = await prismaAny.user?.findUnique?.({
      where: { telegramId },
      include: { settings: true }
    });

    const raw = user?.settings?.displaySettings;
    if (!raw) return undefined;
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

async function getUserDefaultCityIdSafe(telegramId: string): Promise<number | null> {
  const prismaAny = prisma as any;
  try {
    const user = await prismaAny.user?.findUnique?.({
      where: { telegramId },
      include: { settings: true }
    });
    const id = user?.settings?.defaultCityId;
    return typeof id === 'number' ? id : null;
  } catch {
    return null;
  }
}

/**
 * Показать текущую погоду
 */
async function showCurrentWeather(
  ctx: Context,
  locationId?: number,
  fromMenu: boolean = true
): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  try {
    const telegramId = userId.toString();
    const user = await getOrCreateUser(telegramId, ctx.from?.language_code);

    // Получаем все локации пользователя
    const locations = await prisma.location.findMany({
      where: { userId: user.id },
      orderBy: { id: 'desc' }
    });

    // Если нет сохраненных городов
    if (locations.length === 0) {
      await handleNoCities(ctx, userId);
      return;
    }

    // Определяем целевую локацию
    let targetLocation = locations[0];

    // Если локация не указана явно — пробуем взять основную из настроек
    if (!locationId) {
      const defaultCityId = await getUserDefaultCityIdSafe(telegramId);
      if (defaultCityId) {
        const foundDefault = locations.find((loc) => loc.id === defaultCityId);
        if (foundDefault) {
          targetLocation = foundDefault;
        }
      }
    }

    if (locationId) {
      const found = locations.find((loc) => loc.id === locationId);
      if (found) {
        targetLocation = found;
      }
    }

    // Получаем данные о погоде
    const result = await getCurrentWeatherByLocationId(
      targetLocation.id,
      targetLocation.name,
      {
        latitude: targetLocation.latitude,
        longitude: targetLocation.longitude
      },
      'RU', // TODO: получать из БД
      'Europe/Moscow' // TODO: получать из БД
    );

    if (!result.data) {
      // Ошибка получения данных
      await handleWeatherError(
        ctx,
        userId,
        targetLocation.name,
        result.error || 'api_error',
        fromMenu,
        targetLocation.id
      );
      return;
    }

    // Форматируем сообщение
    const displaySettings = await getUserDisplaySettingsSafe(telegramId);
    const message = formatCurrentWeather(
      result.data,
      targetLocation.name,
      'RU', // TODO: получать из БД
      'Europe/Moscow', // TODO: получать из БД
      true, // includeRecommendations
      true, // includeWarnings
      displaySettings
    );

    // Создаем клавиатуру
    const keyboard = getCurrentWeatherKeyboard(targetLocation.id, userId, fromMenu);

    // Отправляем/редактируем сообщение
    let sentMessage;
    if (ctx.callbackQuery) {
      try {
        sentMessage = await ctx.editMessageText(message, {
          reply_markup: keyboard
        });
      } catch (error: any) {
        // Если сообщение не изменилось или другая ошибка, отправляем новое
        if (error.description?.includes('message is not modified')) {
          await ctx.answerCallbackQuery();
          return;
        }
        sentMessage = await ctx.reply(message, { reply_markup: keyboard });
      }
    } else {
      sentMessage = await ctx.reply(message, { reply_markup: keyboard });
    }

    // Сохраняем состояние в историю навигации
    if (sentMessage && typeof sentMessage === 'object' && 'message_id' in sentMessage) {
      pushNavigationState(
        userId,
        'current_weather',
        {
          action: 'show_weather',
          locationId: targetLocation.id,
          locationName: targetLocation.name,
          source: result.source
        },
        sentMessage.message_id
      );
    }

    logger(`User ${userId} viewed weather for ${targetLocation.name} (source: ${result.source})`);
  } catch (error) {
    logger('Error in showCurrentWeather:', error);
    await handleGeneralError(ctx, userId);
  }
}

/**
 * Обработка случая, когда у пользователя нет сохраненных городов
 */
async function handleNoCities(ctx: Context, userId: number): Promise<void> {
  try {
    const keyboard = getNoCitiesKeyboard(userId);
    const message = formatWeatherError('', 'no_cities');

    let sentMessage;
    if (ctx.callbackQuery) {
      try {
        sentMessage = await ctx.editMessageText(message, {
          reply_markup: keyboard
        });
      } catch (error: any) {
        if (error.description?.includes('message is not modified')) {
          await ctx.answerCallbackQuery();
          return;
        }
        sentMessage = await ctx.reply(message, { reply_markup: keyboard });
      }
    } else {
      sentMessage = await ctx.reply(message, { reply_markup: keyboard });
    }

    // Сохраняем состояние
    if (sentMessage && typeof sentMessage === 'object' && 'message_id' in sentMessage) {
      pushNavigationState(
        userId,
        'no_cities',
        { action: 'no_cities' },
        sentMessage.message_id
      );
    }
  } catch (error) {
    logger('Error in handleNoCities:', error);
  }
}

/**
 * Обработка ошибок получения погоды
 */
async function handleWeatherError(
  ctx: Context,
  userId: number,
  cityName: string,
  errorType: string,
  fromMenu: boolean = true,
  locationId?: number
): Promise<void> {
  try {
    const message = formatWeatherError(cityName, errorType);
    const keyboard = getErrorKeyboard(
      userId,
      errorType === 'api_error' && locationId !== undefined,
      locationId ? WeatherCallback.create('refresh', locationId, 'error') : undefined
    );

    let sentMessage;
    if (ctx.callbackQuery) {
      try {
        sentMessage = await ctx.editMessageText(message, {
          reply_markup: keyboard
        });
      } catch (error: any) {
        if (error.description?.includes('message is not modified')) {
          await ctx.answerCallbackQuery();
          return;
        }
        sentMessage = await ctx.reply(message, { reply_markup: keyboard });
      }
    } else {
      sentMessage = await ctx.reply(message, { reply_markup: keyboard });
    }

    // Сохраняем состояние
    if (sentMessage && typeof sentMessage === 'object' && 'message_id' in sentMessage) {
      pushNavigationState(
        userId,
        'weather_error',
        {
          action: 'weather_error',
          cityName,
          errorType
        },
        sentMessage.message_id
      );
    }
  } catch (error) {
    logger('Error in handleWeatherError:', error);
  }
}

/**
 * Показать выбор города
 */
async function showCitySelection(
  ctx: Context,
  returnTo: string = 'weather'
): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  try {
    const telegramId = userId.toString();
    const user = await getOrCreateUser(telegramId, ctx.from?.language_code);

    // Получаем все локации пользователя
    const locations = await prisma.location.findMany({
      where: { userId: user.id },
      orderBy: { id: 'desc' }
    });

    if (locations.length === 0) {
      await handleNoCities(ctx, userId);
      return;
    }

    // Создаем клавиатуру выбора города
    const keyboard = getCitySelectionKeyboard(locations, userId, returnTo);

    // Отправляем сообщение
    const message = 'Выберите город для просмотра погоды:';
    let sentMessage;
    if (ctx.callbackQuery) {
      try {
        sentMessage = await ctx.editMessageText(message, {
          reply_markup: keyboard
        });
      } catch (error: any) {
        if (error.description?.includes('message is not modified')) {
          await ctx.answerCallbackQuery();
          return;
        }
        sentMessage = await ctx.reply(message, { reply_markup: keyboard });
      }
    } else {
      sentMessage = await ctx.reply(message, { reply_markup: keyboard });
    }

    // Сохраняем состояние
    if (sentMessage && typeof sentMessage === 'object' && 'message_id' in sentMessage) {
      pushNavigationState(
        userId,
        'city_selection',
        {
          action: 'select_city',
          returnTo,
          cityCount: locations.length
        },
        sentMessage.message_id
      );
    }
  } catch (error) {
    logger('Error in showCitySelection:', error);
    await handleGeneralError(ctx, userId);
  }
}

/**
 * Обработка обновления погоды
 */
async function handleRefreshWeather(
  ctx: Context,
  locationId: number
): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  try {
    // Получаем информацию о локации
    const location = await prisma.location.findUnique({
      where: { id: locationId }
    });

    if (!location) {
      await ctx.editMessageText(
        'Город не найден. Пожалуйста, выберите другой город.',
        {
          reply_markup: getErrorKeyboard(userId)
        }
      );
      return;
    }

    // Показываем сообщение о загрузке
    try {
      await ctx.editMessageText(`🔄 Обновляю погоду для ${location.name}...`);
    } catch (error: any) {
      // Игнорируем ошибки редактирования
    }

    // Получаем обновленные данные
    const result = await refreshWeather(
      {
        latitude: location.latitude,
        longitude: location.longitude
      },
      location.name,
      locationId,
      'RU', // TODO: получать из БД
      'Europe/Moscow' // TODO: получать из БД
    );

    if (!result.data) {
      await handleWeatherError(
        ctx,
        userId,
        location.name,
        result.error || 'api_error',
        false,
        locationId
      );
      return;
    }

    // Форматируем сообщение
    let message = formatCurrentWeather(
      result.data,
      location.name,
      'RU', // TODO: получать из БД
      'Europe/Moscow', // TODO: получать из БД
      true,
      true
    );

    // Добавляем информацию об источнике
    if (result.source !== 'cache') {
      message += `\n\n📡 Данные обновлены: ${result.source}`;
    }

    // Создаем клавиатуру
    const keyboard = getCurrentWeatherKeyboard(locationId, userId, false);

    // Обновляем сообщение
    const sentMessage = await ctx.editMessageText(message, {
      reply_markup: keyboard
    });

    // Сохраняем новое состояние
    if (sentMessage && typeof sentMessage === 'object' && 'message_id' in sentMessage) {
      pushNavigationState(
        userId,
        'current_weather',
        {
          action: 'refresh',
          locationId: location.id,
          locationName: location.name,
          source: result.source
        },
        sentMessage.message_id
      );
    }

    logger(`User ${userId} refreshed weather for ${location.name} (source: ${result.source})`);
  } catch (error) {
    logger('Error in handleRefreshWeather:', error);
    await ctx.editMessageText(
      '⚠️ Не удалось обновить данные. Пожалуйста, попробуйте позже.',
      {
        reply_markup: getErrorKeyboard(userId)
      }
    );
  }
}

/**
 * Обработка выбора города
 */
async function handleCitySelection(
  ctx: Context,
  locationId: number,
  returnTo: string = 'weather'
): Promise<void> {
  if (returnTo === 'weather') {
    await showCurrentWeather(ctx, locationId, false);
  } else {
    // TODO: обработка для других returnTo
    await showCurrentWeather(ctx, locationId, false);
  }
}

/**
 * Обработка общих ошибок
 */
async function handleGeneralError(ctx: Context, userId?: number): Promise<void> {
  if (!userId) {
    userId = ctx.from?.id;
  }
  if (!userId) return;

  const keyboard = getErrorKeyboard(userId);

  try {
    if (ctx.callbackQuery) {
      await ctx.editMessageText(
        '⚠️ Произошла ошибка. Пожалуйста, попробуйте еще раз.',
        { reply_markup: keyboard }
      );
    } else {
      await ctx.reply(
        '⚠️ Произошла ошибка. Пожалуйста, попробуйте еще раз.',
        { reply_markup: keyboard }
      );
    }
  } catch (error) {
    logger('Error in handleGeneralError:', error);
  }
}

/**
 * Регистрация обработчиков текущей погоды
 */
export function registerCurrentWeatherHandlers(bot: Bot<Context>): void {
  // Обработчик для кнопки "Текущая погода" из главного меню
  bot.callbackQuery(/^menu:current_weather$/, async (ctx) => {
    try {
      await ctx.answerCallbackQuery();
    } catch (error: any) {
      if (error.description?.includes('query is too old')) {
        return;
      }
    }
    await showCurrentWeather(ctx, undefined, true);
  });

  // Обработчики для действий с погодой
  bot.callbackQuery(/^weather:/, async (ctx) => {
    try {
      await ctx.answerCallbackQuery();
    } catch (error: any) {
      if (error.description?.includes('query is too old')) {
        return;
      }
    }

    const data = ctx.callbackQuery.data ?? '';
    const parsed = WeatherCallback.parse(data);
    if (!parsed) {
      await ctx.reply('Ошибка обработки запроса.');
      return;
    }

    const action = parsed.action;
    const locationId = parsed.cityId ? Number(parsed.cityId) : undefined;
    const source = parsed.source || '';

    // Сохраняем текущее состояние в историю
    const userId = ctx.from?.id;
    if (userId) {
      pushNavigationState(
        userId,
        'weather_action',
        { action, locationId, source },
        ctx.callbackQuery.message?.message_id
      );
    }

    // Обрабатываем действие
    if (action === 'refresh' && locationId) {
      await handleRefreshWeather(ctx, locationId);
    } else if (action === 'change_city') {
      await showCitySelection(ctx, source || 'weather');
    } else if (action === 'select_city' && locationId) {
      await handleCitySelection(ctx, locationId, source || 'weather');
    } else {
      logger(`Unknown weather action: ${action}`);
      await ctx.reply('Неизвестное действие. Возвращаю в главное меню.');
    }
  });
}

