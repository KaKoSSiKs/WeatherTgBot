/**
 * Notification Create Handler
 * 
 * Обработчик визарда создания уведомлений.
 */

import type { Context } from 'telegraf';
import { NotifCreateCallback } from '../keyboards/callback_data';
import {
  notifCreateTypeKeyboard,
  notifCreateForecastSubtypeKeyboard,
  notifCreateEventSubtypeKeyboard,
  notifCreateCityKeyboard,
  notifCreateTimeKeyboard,
  notifCreateFrequencyKeyboard,
  notifCreateTempDirectionKeyboard,
  notifCreateTempThresholdKeyboard,
  notifCreatePrecipTypeKeyboard,
  notifCreatePrecipEventKeyboard,
  notifCreateWindThresholdKeyboard,
  notifCreateCheckIntervalKeyboard,
  notifCreateConfirmKeyboard,
  notifCreateSuccessKeyboard,
} from '../keyboards/notifications';
import { NotificationService } from '../../services/notification/notification.service';
import { UserRepository } from '../../storage/prisma/repositories';
import { LocationRepository } from '../../storage/prisma/repositories/location.repository';
import { getState, setState, clearState } from '../state/session';
import { handleError } from './error.handler';
import { logger } from '../../shared/utils/logger';
import { geocodeCity } from '../../integrations/geocoding/geocoding.service';

/**
 * Обработчик визарда создания уведомления
 */
export async function handleNotifCreateCallback(
  ctx: Context,
  notificationService: NotificationService
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
  const parsed = NotifCreateCallback.parse(data);
  
  if (!parsed) {
    return;
  }

  const telegramId = userId.toString();
  const userRepo = new UserRepository();
  const user = await userRepo.findByTelegramId(telegramId);
  
  if (!user) {
    await ctx.reply('❌ Пользователь не найден. Используйте /start для регистрации.');
    return;
  }

  const stateData = getState(userId, 'notification_create');
  let state = stateData ? { step: stateData.step, data: stateData.data || {} } : { step: 'type', data: {} };
  
  try {
    if (parsed.step === 'cancel') {
      clearState(userId, 'notification_create');
      await ctx.editMessageText('❌ Создание подписки отменено.');
      return;
    }

    if (parsed.step === 'back') {
      // Обработка возврата назад
      const prevStep = getPreviousStep(state.step as string);
      if (prevStep) {
        state.step = prevStep;
        setState(userId, 'notification_create', state);
        await showStep(ctx, userId, prevStep, state, notificationService, user.id);
      }
      return;
    }

    if (parsed.step === 'type') {
      // Выбор типа: regular_forecast или weather_event
      state.data.type = parsed.value;
      state.step = 'subtype';
      setState(userId, 'notification_create', state);
      
      if (parsed.value === 'regular_forecast') {
        await ctx.editMessageText(
          '📅 Какой прогноз отправлять?\n\nВыберите тип прогноза:',
          notifCreateForecastSubtypeKeyboard()
        );
      } else if (parsed.value === 'weather_event') {
        await ctx.editMessageText(
          '⚡ Какое погодное событие отслеживать?\n\nВыберите тип события:',
          notifCreateEventSubtypeKeyboard()
        );
      }
      return;
    }

    if (parsed.step === 'subtype') {
      state.data.subtype = parsed.value;
      state.step = 'city';
      setState(userId, 'notification_create', state);
      
      // Показываем выбор города
      const locationRepo = new LocationRepository();
      const locations = await locationRepo.findByUserId(user.id);
      const recentCities = locations.slice(0, 3).map(loc => ({ id: loc.id, name: loc.name }));
      
      await ctx.editMessageText(
        '📍 Выберите город для уведомлений:',
        notifCreateCityKeyboard(recentCities)
      );
      return;
    }

    if (parsed.step === 'city') {
      if (parsed.value === 'location') {
        state.step = 'city_location';
        setState(userId, 'notification_create', state);
        await ctx.reply('📍 Отправьте вашу геолокацию:');
        return;
      } else if (parsed.value === 'custom') {
        state.step = 'city_input';
        setState(userId, 'notification_create', state);
        await ctx.reply('✏️ Введите название города:');
        return;
      } else {
        state.data.locationId = Number(parsed.value);
        await continueAfterCity(ctx, userId, state, notificationService, user.id);
      }
      return;
    }

    if (parsed.step === 'event_param') {
      // Обработка параметров событий
      const paramName = parsed.extra;
      if (!paramName) return;
      
      if (paramName === 'direction') {
        state.data.temp_direction = parsed.value;
        state.step = 'temp_threshold';
        setState(userId, 'notification_create', state);
        await ctx.editMessageText(
          '🌡️ Какое изменение температуры?\n\nВыберите порог изменения:',
          notifCreateTempThresholdKeyboard()
        );
      } else if (paramName === 'threshold') {
        // Порог для температуры
        if (parsed.value === 'custom') {
          state.step = 'temp_threshold_input';
          setState(userId, 'notification_create', state);
          await ctx.reply('✏️ Введите порог изменения температуры (в градусах):');
        } else {
          state.data.temp_threshold = Number(parsed.value);
          state.step = 'check_interval';
          setState(userId, 'notification_create', state);
          await ctx.editMessageText(
            '⏰ Как часто проверять погоду?\n\nВыберите интервал проверки:',
            notifCreateCheckIntervalKeyboard()
          );
        }
      } else if (paramName === 'wind_threshold') {
        // Порог для ветра
        if (parsed.value === 'custom') {
          state.step = 'wind_threshold_input';
          setState(userId, 'notification_create', state);
          await ctx.reply('✏️ Введите порог скорости ветра (м/с):');
        } else {
          state.data.wind_threshold = Number(parsed.value);
          state.step = 'check_interval';
          setState(userId, 'notification_create', state);
          await ctx.editMessageText(
            '⏰ Как часто проверять погоду?\n\nВыберите интервал проверки:',
            notifCreateCheckIntervalKeyboard()
          );
        }
      } else if (paramName === 'precip_type') {
        state.data.precip_type = parsed.value;
        state.step = 'precip_event';
        setState(userId, 'notification_create', state);
        await ctx.editMessageText(
          '🌧️ Какое событие осадков отслеживать?\n\nВыберите событие:',
          notifCreatePrecipEventKeyboard()
        );
      } else if (paramName === 'precip_event') {
        state.data.precip_event = parsed.value;
        state.step = 'check_interval';
        setState(userId, 'notification_create', state);
        await ctx.editMessageText(
          '⏰ Как часто проверять погоду?\n\nВыберите интервал проверки:',
          notifCreateCheckIntervalKeyboard()
        );
      } else if (paramName === 'check_interval') {
        if (parsed.value === 'custom') {
          state.step = 'check_interval_input';
          setState(userId, 'notification_create', state);
          await ctx.reply('✏️ Введите интервал проверки (в часах):');
        } else {
          state.data.check_interval = Number(parsed.value);
          await showConfirmStep(ctx, userId, state, notificationService, user.id);
        }
      }
      return;
    }

    if (parsed.step === 'time') {
      if (parsed.value === 'custom') {
        state.step = 'time_input';
        setState(userId, 'notification_create', state);
        await ctx.reply('✏️ Введите время в формате HH:mm (например, 08:30):');
      } else {
        state.data.time = parsed.value;
        state.step = 'frequency';
        setState(userId, 'notification_create', state);
        await ctx.editMessageText(
          '📅 Как часто отправлять прогноз?\n\nВыберите расписание:',
          notifCreateFrequencyKeyboard()
        );
      }
      return;
    }

    if (parsed.step === 'frequency') {
      state.data.frequency = parsed.value;
      await showConfirmStep(ctx, userId, state, notificationService, user.id);
      return;
    }

    if (parsed.step === 'confirm') {
      await createNotificationFromState(ctx, userId, state, notificationService, user.id);
      return;
    }

    if (parsed.step === 'name') {
      state.step = 'name_input';
      setState(userId, 'notification_create', state);
      await ctx.reply('✏️ Введите название для подписки:');
      return;
    }

  } catch (error) {
    logger.error('Error in notification create handler:', error);
    const errorMessage = handleError(ctx, error);
    await ctx.reply(errorMessage);
  }
}

/**
 * Получить предыдущий шаг
 */
function getPreviousStep(currentStep: string): string | null {
  const stepMap: Record<string, string> = {
    'subtype': 'type',
    'city': 'subtype',
    'time': 'city',
    'frequency': 'time',
    'temp_threshold': 'temp_direction',
    'precip_event': 'precip_type',
    'wind_threshold': 'event_subtype',
    'check_interval': 'event_param',
    'confirm': 'frequency'
  };
  return stepMap[currentStep] || null;
}

/**
 * Показать шаг визарда
 */
async function showStep(
  ctx: Context,
  userId: number,
  step: string,
  state: any,
  notificationService: NotificationService,
  userDbId: number
): Promise<void> {
  switch (step) {
    case 'type':
      await ctx.editMessageText(
        '🔔 Создание подписки\n\nВыберите тип уведомления:',
        notifCreateTypeKeyboard()
      );
      break;
    case 'subtype':
      if (state.data.type === 'regular_forecast') {
        await ctx.editMessageText(
          '📅 Какой прогноз отправлять?\n\nВыберите тип прогноза:',
          notifCreateForecastSubtypeKeyboard()
        );
      } else {
        await ctx.editMessageText(
          '⚡ Какое погодное событие отслеживать?\n\nВыберите тип события:',
          notifCreateEventSubtypeKeyboard()
        );
      }
      break;
    case 'city': {
      const locationRepo = new LocationRepository();
      const locations = await locationRepo.findByUserId(userDbId);
      const recentCities = locations.slice(0, 3).map(loc => ({ id: loc.id, name: loc.name }));
      await ctx.editMessageText(
        '📍 Выберите город для уведомлений:',
        notifCreateCityKeyboard(recentCities)
      );
      break;
    }
    case 'time':
      await ctx.editMessageText(
        '⏰ Во сколько отправлять прогноз?\n\nВыберите время:',
        notifCreateTimeKeyboard()
      );
      break;
    case 'frequency':
      await ctx.editMessageText(
        '📅 Как часто отправлять прогноз?\n\nВыберите расписание:',
        notifCreateFrequencyKeyboard()
      );
      break;
    default:
      await showConfirmStep(ctx, userId, state, notificationService, userDbId);
  }
}

/**
 * Продолжить после выбора города
 */
async function continueAfterCity(
  ctx: Context,
  userId: number,
  state: any,
  notificationService: NotificationService,
  userDbId: number
): Promise<void> {
  if (state.data.type === 'regular_forecast') {
    state.step = 'time';
    setState(userId, 'notification_create', state);
    await ctx.editMessageText(
      '⏰ Во сколько отправлять прогноз?\n\nВыберите время:',
      notifCreateTimeKeyboard()
    );
  } else {
    // Для событий нужно выбрать параметры события
    if (state.data.subtype === 'temperature_change') {
      state.step = 'temp_direction';
      setState(userId, 'notification_create', state);
      await ctx.editMessageText(
        '🌡️ Какое изменение температуры?\n\nВыберите направление изменения:',
        notifCreateTempDirectionKeyboard()
      );
    } else if (state.data.subtype === 'precipitation') {
      state.step = 'precip_type';
      setState(userId, 'notification_create', state);
      await ctx.editMessageText(
        '🌧️ Какие осадки отслеживать?\n\nВыберите тип осадков:',
        notifCreatePrecipTypeKeyboard()
      );
    } else if (state.data.subtype === 'wind') {
      state.step = 'wind_threshold';
      setState(userId, 'notification_create', state);
      await ctx.editMessageText(
        '💨 При какой скорости ветра уведомлять?\n\nВыберите порог:',
        notifCreateWindThresholdKeyboard()
      );
    }
  }
}

/**
 * Показать шаг подтверждения
 */
async function showConfirmStep(
  ctx: Context,
  userId: number,
  state: any,
  notificationService: NotificationService,
  userDbId: number
): Promise<void> {
  state.step = 'confirm';
  setState(userId, 'notification_create', state);
  
  // Формируем описание подписки
  let description = '📋 Подписка:\n\n';
  
  if (state.data.type === 'regular_forecast') {
    description += `Тип: Регулярный прогноз\n`;
    description += `Подтип: ${state.data.subtype}\n`;
    description += `Время: ${state.data.time || '08:00'}\n`;
    description += `Расписание: ${state.data.frequency === 'daily' ? 'Ежедневно' :
                   state.data.frequency === 'weekdays' ? 'По будням' :
                   state.data.frequency === 'weekends' ? 'По выходным' :
                   'Один раз'}\n`;
  } else {
    description += `Тип: Погодное событие\n`;
    description += `Подтип: ${state.data.subtype}\n`;
    if (state.data.subtype === 'temperature_change') {
      description += `Направление: ${state.data.temp_direction === 'increase' ? 'Потепление' :
                     state.data.temp_direction === 'decrease' ? 'Похолодание' :
                     'Любое изменение'}\n`;
      description += `Порог: ${state.data.temp_threshold || 5}°C\n`;
    } else if (state.data.subtype === 'precipitation') {
      description += `Тип осадков: ${state.data.precip_type === 'rain' ? 'Дождь' :
                     state.data.precip_type === 'snow' ? 'Снег' :
                     'Любые'}\n`;
      description += `Событие: ${state.data.precip_event === 'start' ? 'Начало' : 'Окончание'}\n`;
    } else if (state.data.subtype === 'wind') {
      description += `Порог ветра: ${state.data.wind_threshold || 10} м/с\n`;
    }
    description += `Интервал проверки: ${state.data.check_interval || 3} часа\n`;
  }
  
  await ctx.editMessageText(
    description + '\n✅ Создать подписку?',
    notifCreateConfirmKeyboard()
  );
}

/**
 * Создать уведомление из состояния
 */
async function createNotificationFromState(
  ctx: Context,
  userId: number,
  state: any,
  notificationService: NotificationService,
  userDbId: number
): Promise<void> {
  try {
    const locationRepo = new LocationRepository();
    let locationId = state.data.locationId;
    
    // Если locationId не указан, используем дефолтную локацию
    if (!locationId) {
      const locations = await locationRepo.findByUserId(userDbId);
      if (locations.length > 0) {
        locationId = locations[0].id;
      } else {
        await ctx.reply('❌ Ошибка: не указана локация. Добавьте город в настройках.');
        return;
      }
    }

    // Формируем параметры уведомления
    let parameters: any = {};
    let schedule: string = 'daily';
    
    if (state.data.type === 'regular_forecast') {
      parameters = {
        time: state.data.time || '08:00'
      };
      schedule = state.data.frequency || 'daily';
    } else {
      // Погодное событие
      if (state.data.subtype === 'temperature_change') {
        parameters = {
          direction: state.data.temp_direction || 'any',
          threshold: state.data.temp_threshold || 5,
          checkIntervalHours: state.data.check_interval || 3
        };
      } else if (state.data.subtype === 'precipitation') {
        parameters = {
          precipitationType: state.data.precip_type || 'any',
          eventType: state.data.precip_event || 'start',
          checkIntervalHours: state.data.check_interval || 3
        };
      } else if (state.data.subtype === 'wind') {
        parameters = {
          threshold: state.data.wind_threshold || 10,
          checkIntervalHours: state.data.check_interval || 3
        };
      }
      schedule = 'daily'; // События проверяются по расписанию
    }

    const notificationId = await notificationService.createNotification({
      userId: userDbId,
      chatId: userId,
      locationId,
      subscriptionType: state.data.type,
      subtype: state.data.subtype,
      parameters,
      schedule: schedule as any,
      customName: state.data.customName
    });

    clearState(userId, 'notification_create');
    
    await ctx.editMessageText(
      '✅ Подписка успешно создана!',
      notifCreateSuccessKeyboard()
    );
    
    logger.info(`Notification created: ${notificationId} for user ${userDbId}`);
  } catch (error) {
    logger.error('Error creating notification:', error);
    const errorMessage = handleError(ctx, error);
    await ctx.reply(errorMessage);
  }
}

/**
 * Обработка текстового ввода в визарде
 */
export async function handleNotifCreateText(
  ctx: Context,
  notificationService: NotificationService
): Promise<boolean> {
  const userId = ctx.from?.id;
  if (!userId) return false;

  const stateData = getState(userId, 'notification_create');
  if (!stateData) return false;
  
  let state = { step: stateData.step, data: stateData.data || {} };

  const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
  if (!text) return false;

  try {
    if (state.step === 'city_input') {
      // Обработка ввода города
      const geocoded = await geocodeCity(text);
      if (!geocoded) {
        await ctx.reply('❌ Город не найден. Попробуйте другой вариант.');
        return true;
      }

      const locationRepo = new LocationRepository();
      const userRepo = new UserRepository();
      const telegramId = userId.toString();
      const user = await userRepo.findByTelegramId(telegramId);
      
      if (!user) {
        await ctx.reply('❌ Пользователь не найден.');
        return true;
      }

      // Проверяем, есть ли уже такая локация
      const existing = await locationRepo.findByUserId(user.id);
      let location = existing.find(l => 
        Math.abs(l.latitude - geocoded.latitude) < 0.01 &&
        Math.abs(l.longitude - geocoded.longitude) < 0.01
      );

      if (!location) {
        // Создаем новую локацию
        location = await locationRepo.create({
          name: geocoded.name,
          latitude: geocoded.latitude,
          longitude: geocoded.longitude,
          user: { connect: { id: user.id } }
        });
      }

      state.data.locationId = location.id;
      setState(userId, 'notification_create', state);
      await continueAfterCity(ctx, userId, state, notificationService, user.id);
      return true;
    }

    if (state.step === 'time_input') {
      // Валидация времени
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(text)) {
        await ctx.reply('❌ Неверный формат времени. Используйте HH:mm (например, 08:30)');
        return true;
      }
      state.data.time = text;
      state.step = 'frequency';
      setState(userId, 'notification_create', state);
      await ctx.reply(
        '📅 Как часто отправлять прогноз?\n\nВыберите расписание:',
        notifCreateFrequencyKeyboard()
      );
      return true;
    }

    if (state.step === 'temp_threshold_input') {
      const threshold = Number(text);
      if (isNaN(threshold) || threshold <= 0) {
        await ctx.reply('❌ Введите положительное число (градусы Цельсия)');
        return true;
      }
      state.data.temp_threshold = threshold;
      state.step = 'check_interval';
      setState(userId, 'notification_create', state);
      await ctx.reply(
        '⏰ Как часто проверять погоду?\n\nВыберите интервал проверки:',
        notifCreateCheckIntervalKeyboard()
      );
      return true;
    }

    if (state.step === 'wind_threshold_input') {
      const threshold = Number(text);
      if (isNaN(threshold) || threshold <= 0) {
        await ctx.reply('❌ Введите положительное число (м/с)');
        return true;
      }
      state.data.wind_threshold = threshold;
      state.step = 'check_interval';
      setState(userId, 'notification_create', state);
      await ctx.reply(
        '⏰ Как часто проверять погоду?\n\nВыберите интервал проверки:',
        notifCreateCheckIntervalKeyboard()
      );
      return true;
    }

    if (state.step === 'check_interval_input') {
      const interval = Number(text);
      if (isNaN(interval) || interval < 1 || interval > 24) {
        await ctx.reply('❌ Введите число от 1 до 24 (часы)');
        return true;
      }
      state.data.check_interval = interval;
      await showConfirmStep(ctx, userId, state, notificationService, (await new UserRepository().findByTelegramId(userId.toString()))!.id);
      return true;
    }

    if (state.step === 'name_input') {
      state.data.customName = text;
      state.step = 'confirm';
      setState(userId, 'notification_create', state);
      await showConfirmStep(ctx, userId, state, notificationService, (await new UserRepository().findByTelegramId(userId.toString()))!.id);
      return true;
    }

    return false;
  } catch (error) {
    logger.error('Error handling text input in notification create:', error);
    return false;
  }
}

