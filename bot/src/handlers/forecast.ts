/**
 * Обработчики для прогнозов на N дней (1, 3, 7, 10).
 */

import type { Bot, Context } from 'grammy';
import { prisma } from '../db/prisma';
import { getOrCreateUser } from '../db/user';
import { logger } from '../utils/logger';
import { pushNavigationState, getPreviousNavigationState } from '../utils/navigation';
import { ForecastCallback } from '../keyboards/callback_data';
import {
  getForecastNavigationKeyboard,
  getDetailedForecastKeyboard,
  getDailyForecastItemKeyboard,
  getHourlyForecastKeyboard
} from '../keyboards/forecast';
import {
  formatDailyForecast,
  formatDetailedForecast,
  formatHourlyForecast
} from '../services/weatherFormatter';
import {
  getDailyForecast,
  getHourlyForecast,
  getDetailedDailyForecast,
  getInterpolatedHourlyForecast,
  refreshDetailedForecast
} from '../services/weatherService';
import { getErrorKeyboard } from '../keyboards/currentWeather';
import { DateTime } from 'luxon';

async function getUserSettingsForFormattingSafe(telegramId: string): Promise<{
  defaultCityId: number | null;
  displaySettings?: Record<string, boolean>;
}> {
  const prismaAny = prisma as any;
  try {
    const user = await prismaAny.user?.findUnique?.({
      where: { telegramId },
      include: { settings: true }
    });
    const defaultCityId = typeof user?.settings?.defaultCityId === 'number' ? user.settings.defaultCityId : null;

    const raw = user?.settings?.displaySettings;
    const displaySettings = raw ? (JSON.parse(raw) as Record<string, boolean>) : undefined;

    return { defaultCityId, displaySettings };
  } catch {
    return { defaultCityId: null, displaySettings: undefined };
  }
}

/**
 * Показать прогноз на N дней
 */
async function showForecast(
  ctx: Context,
  forecastType: string,
  locationId?: number,
  fromMenu: boolean = true
): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  try {
    const telegramId = userId.toString();
    const user = await getOrCreateUser(telegramId, ctx.from?.language_code);

    const userSettings = await getUserSettingsForFormattingSafe(telegramId);

    // Получаем все локации пользователя
    const locations = await prisma.location.findMany({
      where: { userId: user.id },
      orderBy: { id: 'desc' }
    });

    // Если нет сохраненных городов
    if (locations.length === 0) {
      await handleNoCitiesForecast(ctx, userId);
      return;
    }

    // Определяем целевую локацию
    let targetLocation = locations[0];

    if (!locationId && userSettings.defaultCityId) {
      const foundDefault = locations.find((loc) => loc.id === userSettings.defaultCityId);
      if (foundDefault) targetLocation = foundDefault;
    }

    if (locationId) {
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
      '10day': 10
    };
    const days = daysMap[forecastType] || 1;

    // Получаем прогноз
    const forecastResult = await getDailyForecast(
      {
        latitude: targetLocation.latitude,
        longitude: targetLocation.longitude
      },
      targetLocation.name,
      days,
      targetLocation.id,
      'RU', // TODO: получать из БД
      'Europe/Moscow' // TODO: получать из БД
    );

    if (!forecastResult.data || forecastResult.data.length === 0) {
      await handleForecastError(
        ctx,
        userId,
        targetLocation.name,
        forecastType,
        fromMenu
      );
      return;
    }

    // Отправляем каждый день отдельным сообщением
    const sentMessages: number[] = [];

    for (let i = 0; i < forecastResult.data.length; i++) {
      const dayForecast = forecastResult.data[i];

      // Форматируем краткий прогноз
      const message = formatDailyForecast(
        dayForecast,
        targetLocation.name,
        'RU', // TODO: получать из БД
        false, // В кратком формате без рекомендаций
        false, // Без предупреждений
        userSettings.displaySettings
      );

      // Создаем клавиатуру для каждого дня
      const keyboard = getDailyForecastItemKeyboard(
        targetLocation.id,
        DateTime.fromJSDate(dayForecast.date).toFormat('yyyy-MM-dd'),
        userId
      );

      let sentMessage;
      if (i === 0 && ctx.callbackQuery) {
        // Первое сообщение редактируем
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
        // Остальные отправляем новыми
        sentMessage = await ctx.reply(message, { reply_markup: keyboard });
      }

      if (sentMessage && typeof sentMessage === 'object' && 'message_id' in sentMessage) {
        sentMessages.push(sentMessage.message_id);
      }
    }

    // Отправляем навигационное сообщение после всех дней
    if (sentMessages.length > 0) {
      await sendForecastNavigation(
        ctx,
        forecastType,
        targetLocation.id,
        targetLocation.name,
        userId,
        fromMenu,
        sentMessages[sentMessages.length - 1]
      );
    }

    // Сохраняем состояние в историю
    if (sentMessages.length > 0) {
      pushNavigationState(
        userId,
        'forecast',
        {
          action: 'show_forecast',
          forecastType,
          locationId: targetLocation.id,
          locationName: targetLocation.name,
          days,
          source: forecastResult.source
        },
        sentMessages[0]
      );
    }

    logger(`User ${userId} viewed ${forecastType} forecast for ${targetLocation.name}`);
  } catch (error) {
    logger('Error in showForecast:', error);
    await handleGeneralError(ctx, userId);
  }
}

/**
 * Отправить навигационное сообщение после прогноза
 */
async function sendForecastNavigation(
  ctx: Context,
  forecastType: string,
  locationId: number,
  cityName: string,
  userId: number,
  fromMenu: boolean = true,
  lastMessageId?: number
): Promise<void> {
  try {
    // Текст завершения
    const typeTexts: Record<string, string> = {
      'day': 'Прогноз на день завершен.',
      '3day': 'Прогноз на 3 дня завершен.',
      '7day': 'Прогноз на 7 дней завершен.',
      '10day': 'Прогноз на 10 дней завершен.'
    };
    const text = typeTexts[forecastType] || 'Прогноз завершен.';

    // Создаем клавиатуру навигации
    const keyboard = getForecastNavigationKeyboard(
      forecastType,
      locationId,
      userId,
      fromMenu
    );

    // Отправляем сообщение
    const sentMessage = await ctx.reply(text, { reply_markup: keyboard });

    if (sentMessage && typeof sentMessage === 'object' && 'message_id' in sentMessage) {
      // Сохраняем состояние навигации
      pushNavigationState(
        userId,
        'forecast_navigation',
        {
          action: 'forecast_navigation',
          forecastType,
          locationId
        },
        sentMessage.message_id
      );
    }
  } catch (error) {
    logger('Error in sendForecastNavigation:', error);
  }
}

/**
 * Показать детальный прогноз на конкретный день
 */
async function showDetailedForecast(
  ctx: Context,
  locationId: number,
  dateStr: string,
  fromForecastType: string
): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  try {
    // Получаем информацию о локации
    const location = await prisma.location.findUnique({
      where: { id: locationId }
    });

    if (!location) {
      await handleGeneralError(ctx, userId);
      return;
    }

    // Получаем пользователя для настроек
    const telegramId = userId.toString();
    const user = await getOrCreateUser(telegramId, ctx.from?.language_code);

    const userSettings = await getUserSettingsForFormattingSafe(telegramId);

    // Получаем улучшенный детальный прогноз
    const detailedForecastResult = await getDetailedDailyForecast(
      {
        latitude: location.latitude,
        longitude: location.longitude
      },
      location.name,
      dateStr,
      locationId,
      'RU', // TODO: получать из БД
      'Europe/Moscow', // TODO: получать из БД
      true // useCache
    );

    if (!detailedForecastResult.data) {
      await handleForecastError(
        ctx,
        userId,
        location.name,
        fromForecastType,
        false
      );
      return;
    }

    // Форматируем улучшенный детальный прогноз
    let message = formatDetailedForecast(
      detailedForecastResult.data,
      location.name,
      'RU', // TODO: получать из БД
      'Europe/Moscow', // TODO: получать из БД
      true, // includeRecommendations
      true, // includeWarnings
      userSettings.displaySettings
    );

    // Добавляем информацию об источнике данных, если не из кэша
    if (detailedForecastResult.source !== 'cache') {
      message += `\n\n📡 Данные обновлены: ${detailedForecastResult.source}`;
    }

    // Создаем клавиатуру
    const keyboard = getDetailedForecastKeyboard(
      locationId,
      fromForecastType,
      userId,
      dateStr
    );

    // Отправляем/редактируем сообщение
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

    if (sentMessage && typeof sentMessage === 'object' && 'message_id' in sentMessage) {
      // Сохраняем состояние
      pushNavigationState(
        userId,
        'detailed_forecast',
        {
          action: 'detailed_forecast',
          locationId,
          date: dateStr,
          fromForecastType
        },
        sentMessage.message_id
      );
    }

    logger(`User ${userId} viewed detailed forecast for ${location.name} on ${dateStr}`);
  } catch (error) {
    logger('Error in showDetailedForecast:', error);
    await handleGeneralError(ctx, userId);
  }
}

/**
 * Показать почасовой прогноз на конкретный день
 */
async function showHourlyForecast(
  ctx: Context,
  locationId: number,
  dateStr: string
): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  try {
    // Получаем информацию о локации
    const location = await prisma.location.findUnique({
      where: { id: locationId }
    });

    if (!location) {
      await handleGeneralError(ctx, userId);
      return;
    }

    // Получаем интерполированный почасовой прогноз (шаг 1 час)
    const hourlyResult = await getInterpolatedHourlyForecast(
      {
        latitude: location.latitude,
        longitude: location.longitude
      },
      location.name,
      dateStr,
      locationId,
      'RU', // TODO: получать из БД
      'Europe/Moscow' // TODO: получать из БД
    );

    // Если интерполированный прогноз не получен, пробуем обычный
    if (!hourlyResult.data || hourlyResult.data.length === 0) {
      const fallbackResult = await getHourlyForecast(
        {
          latitude: location.latitude,
          longitude: location.longitude
        },
        location.name,
        dateStr,
        locationId,
        'RU', // TODO: получать из БД
        'Europe/Moscow' // TODO: получать из БД
      );

      if (!fallbackResult.data || fallbackResult.data.length === 0) {
        await ctx.editMessageText(
          `Нет данных почасового прогноза для ${location.name} на выбранную дату.`,
          {
            reply_markup: getErrorKeyboard(userId)
          }
        );
        return;
      }

      // Используем fallback данные
      hourlyResult.data = fallbackResult.data;
      hourlyResult.source = fallbackResult.source;
    }

    // Форматируем дату для отображения
    const displayDate = dateStr === 'today'
      ? DateTime.now().toFormat('dd.MM.yyyy')
      : DateTime.fromISO(dateStr).toFormat('dd.MM.yyyy');

    // Форматируем улучшенный почасовой прогноз
    const userSettings = await getUserSettingsForFormattingSafe(userId.toString());
    let message = formatHourlyForecast(
      hourlyResult.data,
      location.name,
      displayDate,
      false, // compact = false для полного формата
      userSettings.displaySettings
    );

    // Добавляем информацию об источнике данных, если не из кэша
    if (hourlyResult.source !== 'cache') {
      message += `\n\n📡 Данные обновлены: ${hourlyResult.source}`;
    }

    // Создаем клавиатуру с навигацией (передаем dateStr для возврата к детальному)
    const keyboard = getHourlyForecastKeyboard(locationId, userId, dateStr, true);

    // Отправляем/редактируем сообщение
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
        // Всегда новое сообщение для почасового прогноза
        sentMessage = await ctx.reply(message, { reply_markup: keyboard });
      }
    } else {
      sentMessage = await ctx.reply(message, { reply_markup: keyboard });
    }

    if (sentMessage && typeof sentMessage === 'object' && 'message_id' in sentMessage) {
      // Сохраняем состояние
      pushNavigationState(
        userId,
        'hourly_forecast',
        {
          action: 'hourly_forecast',
          locationId,
          date: dateStr,
          source: hourlyResult.source
        },
        sentMessage.message_id
      );
    }

    logger(`User ${userId} viewed hourly forecast for ${location.name} on ${dateStr}`);
  } catch (error) {
    logger('Error in showHourlyForecast:', error);
    await handleGeneralError(ctx, userId);
  }
}

/**
 * Обработка отсутствия городов для прогноза
 */
async function handleNoCitiesForecast(
  ctx: Context,
  userId: number
): Promise<void> {
  try {
    const { getNoCitiesKeyboard } = await import('../keyboards/currentWeather');
    const keyboard = getNoCitiesKeyboard(userId);
    const message = 'У вас нет сохраненных локаций.\n\nДобавьте локацию, чтобы получать прогноз:';

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

    if (sentMessage && typeof sentMessage === 'object' && 'message_id' in sentMessage) {
      pushNavigationState(
        userId,
        'no_cities_forecast',
        { action: 'no_cities_forecast' },
        sentMessage.message_id
      );
    }
  } catch (error) {
    logger('Error in handleNoCitiesForecast:', error);
  }
}

/**
 * Обработка ошибок получения прогноза
 */
async function handleForecastError(
  ctx: Context,
  userId: number,
  cityName: string,
  forecastType: string,
  fromMenu: boolean = true
): Promise<void> {
  try {
    const typeTexts: Record<string, string> = {
      'day': 'на день',
      '3day': 'на 3 дня',
      '7day': 'на 7 дней',
      '10day': 'на 10 дней'
    };
    const forecastText = typeTexts[forecastType] || '';
    const message = `⚠️ Не удалось получить прогноз ${forecastText} для ${cityName}.\nПожалуйста, попробуйте позже.`;

    const keyboard = getErrorKeyboard(userId);

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

    if (sentMessage && typeof sentMessage === 'object' && 'message_id' in sentMessage) {
      pushNavigationState(
        userId,
        'forecast_error',
        {
          action: 'forecast_error',
          cityName,
          forecastType
        },
        sentMessage.message_id
      );
    }
  } catch (error) {
    logger('Error in handleForecastError:', error);
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
 * Обработчик callback для прогнозов
 */
async function callbackForecast(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  try {
    await ctx.answerCallbackQuery();

    const data = ctx.callbackQuery?.data ?? '';
    const parsed = ForecastCallback.parse(data);

    if (!parsed) {
      await ctx.reply('Ошибка обработки запроса.');
      return;
    }

    const forecastType = parsed.type;
    const locationId = parsed.cityId ? Number(parsed.cityId) : undefined;
    const dateStr = parsed.date || '';
    const fromType = parsed.from || '';

    // Сохраняем текущее состояние в историю
    pushNavigationState(
      userId,
      'callback_forecast',
      {
        type: forecastType,
        locationId,
        date: dateStr,
        from: fromType
      },
      ctx.callbackQuery?.message?.message_id
    );

    // Обрабатываем тип прогноза
    if (forecastType === 'detailed_refresh' && locationId && dateStr) {
      // Обновление детального прогноза
      const location = await prisma.location.findUnique({
        where: { id: locationId }
      });
      if (location) {
        const refreshedResult = await refreshDetailedForecast(
          {
            latitude: location.latitude,
            longitude: location.longitude
          },
          location.name,
          dateStr,
          locationId,
          'RU',
          'Europe/Moscow'
        );
        if (refreshedResult.data) {
          // Используем тот же обработчик, но с обновленными данными
          await showDetailedForecast(ctx, locationId, dateStr, fromType || 'detailed');
        } else {
          await handleGeneralError(ctx, userId);
        }
      } else {
        await handleGeneralError(ctx, userId);
      }
    } else if (forecastType === 'detailed' && locationId && dateStr) {
      await showDetailedForecast(ctx, locationId, dateStr, fromType);
    } else if (forecastType === 'hourly' && locationId && dateStr) {
      await showHourlyForecast(ctx, locationId, dateStr);
    } else if (['day', '3day', '7day', '10day'].includes(forecastType)) {
      await showForecast(ctx, forecastType, locationId, fromType === 'main_menu');
    } else {
      logger(`Unknown forecast type: ${forecastType}`);
      await handleGeneralError(ctx, userId);
    }
  } catch (error) {
    logger('Error in callbackForecast:', error);
    await handleGeneralError(ctx, ctx.from?.id);
  }
}

/**
 * Регистрация всех обработчиков прогнозов
 */
export function registerForecastHandlers(bot: Bot<Context>): void {
  // Обработчик для всех действий с прогнозами (должен быть первым, чтобы перехватывать все forecast:)
  bot.callbackQuery(/^forecast:/, callbackForecast);
}

