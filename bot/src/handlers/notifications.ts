/**
 * Обработчики для системы уведомлений
 * Включает главное меню, список подписок, детали, создание и управление
 */

import type { Bot, Context } from 'grammy';
import { prisma } from '../db/prisma';
import { getOrCreateUser } from '../db/user';
import { logger } from '../utils/logger';
import { pushNavigationState } from '../utils/navigation';
import { NotificationCallback, NotifCreateCallback, NavCallback } from '../keyboards/callback_data';
import {
  notificationMainKeyboard,
  notificationListKeyboard,
  notificationEmptyListKeyboard,
  notificationDetailKeyboard,
  notificationDeleteConfirmKeyboard,
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
  notifCreateSuccessKeyboard
} from '../keyboards/notifications';
import {
  getNotificationService,
  getDisplayType,
  getDisplaySchedule,
  parseParameters,
  type RegularForecastParams,
  type TemperatureEventParams,
  type PrecipitationEventParams,
  type WindEventParams,
  type SubscriptionType,
  type ScheduleType
} from '../services/notificationService';
import { setFlowState, getFlowState, clearFlowState, type FlowState } from '../state/session';
import { mainMenuKeyboard, MAIN_MENU_TEXT } from '../keyboards/mainMenu';

// ==================== СОСТОЯНИЕ СОЗДАНИЯ УВЕДОМЛЕНИЯ ====================

interface NotificationCreateData {
  subscriptionType?: SubscriptionType;
  subtype?: string;
  cityId?: number;
  cityName?: string;
  time?: string;
  schedule?: ScheduleType;
  customName?: string;
  // Для погодных событий
  tempDirection?: 'increase' | 'decrease' | 'any';
  tempThreshold?: number;
  precipType?: 'rain' | 'snow' | 'any';
  precipEvent?: 'start' | 'end';
  windThreshold?: number;
  checkInterval?: number;
}

type NotificationCreateStep = 
  | 'type' 
  | 'subtype' 
  | 'city' 
  | 'city_input'
  | 'time' 
  | 'time_input'
  | 'frequency' 
  | 'temp_direction'
  | 'temp_threshold'
  | 'temp_threshold_input'
  | 'precip_type'
  | 'precip_event'
  | 'wind_threshold'
  | 'wind_threshold_input'
  | 'check_interval'
  | 'check_interval_input'
  | 'confirm'
  | 'name_input';

interface NotificationFlowState extends FlowState {
  flow: 'notification_create';
  step: NotificationCreateStep;
  data: NotificationCreateData;
}

// ==================== ГЛАВНОЕ МЕНЮ УВЕДОМЛЕНИЙ ====================

/**
 * Показать главное меню уведомлений
 */
async function showNotificationMain(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  try {
    const telegramId = userId.toString();
    const user = await getOrCreateUser(telegramId, ctx.from?.language_code);

    // Получаем статистику
    const notifications = await prisma.notification.findMany({
      where: { userId: user.id }
    });

    const activeCount = notifications.filter(n => n.enabled).length;
    const pausedCount = notifications.filter(n => !n.enabled).length;
    const totalCount = notifications.length;

    const message = `📋 *Уведомления о погоде*

Настройте автоматические уведомления о погоде и погодных событиях.

📊 *Статистика:*
✅ Активных: ${activeCount}
⏸️ Приостановленных: ${pausedCount}
📌 Всего: ${totalCount}

Выберите действие:`;

    const keyboard = notificationMainKeyboard();

    if (ctx.callbackQuery) {
      try {
        await ctx.editMessageText(message, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
      } catch (error: any) {
        if (error.description?.includes('message is not modified')) {
          await ctx.answerCallbackQuery();
          return;
        }
        await ctx.reply(message, { parse_mode: 'Markdown', reply_markup: keyboard });
      }
    } else {
      await ctx.reply(message, { parse_mode: 'Markdown', reply_markup: keyboard });
    }

    pushNavigationState(userId, 'notification_main', { action: 'main' });
  } catch (error) {
    logger('Error in showNotificationMain:', error);
    await ctx.reply('⚠️ Произошла ошибка. Попробуйте позже.');
  }
}

// ==================== СПИСОК ПОДПИСОК ====================

/**
 * Показать список подписок
 */
async function showNotificationList(ctx: Context, page: number = 0): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  try {
    const telegramId = userId.toString();
    const user = await getOrCreateUser(telegramId, ctx.from?.language_code);

    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      include: { location: true },
      orderBy: { createdAt: 'desc' }
    });

    if (notifications.length === 0) {
      const message = `📭 *У вас пока нет подписок*

Создайте первую подписку, чтобы получать уведомления о погоде.`;

      const keyboard = notificationEmptyListKeyboard();

      if (ctx.callbackQuery) {
        try {
          await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            reply_markup: keyboard
          });
        } catch (error: any) {
          if (!error.description?.includes('message is not modified')) {
            await ctx.reply(message, { parse_mode: 'Markdown', reply_markup: keyboard });
          }
        }
      } else {
        await ctx.reply(message, { parse_mode: 'Markdown', reply_markup: keyboard });
      }
      return;
    }

    // Пагинация
    const pageSize = 5;
    const totalPages = Math.ceil(notifications.length / pageSize);
    const currentPage = Math.min(page, totalPages - 1);
    const startIndex = currentPage * pageSize;
    const pageNotifications = notifications.slice(startIndex, startIndex + pageSize);

    // Формируем сообщение
    let message = `📋 *Ваши подписки* (${notifications.length})\n\n`;

    pageNotifications.forEach((notif, index) => {
      const globalIndex = startIndex + index + 1;
      const status = notif.enabled ? '✅' : '⏸️';
      const displayType = getDisplayType(notif.subscriptionType, notif.subtype);
      const cityName = notif.location?.name || 'Неизвестный город';

      message += `${globalIndex}. ${status} ${notif.customName || displayType}\n`;
      message += `   📍 ${cityName}\n`;

      if (notif.subscriptionType === 'regular_forecast') {
        const params = parseParameters<RegularForecastParams>(notif.parameters);
        const schedule = getDisplaySchedule(notif.schedule);
        message += `   ⏰ ${params.time || '—'} (${schedule})\n`;
      } else {
        const params = parseParameters<TemperatureEventParams | PrecipitationEventParams | WindEventParams>(notif.parameters);
        const interval = 'checkIntervalHours' in params ? params.checkIntervalHours : 2;
        message += `   🔄 Проверка: каждые ${interval} ч\n`;
      }

      message += '\n';
    });

    if (totalPages > 1) {
      message += `📄 Страница ${currentPage + 1} из ${totalPages}`;
    }

    // Формируем клавиатуру
    const keyboardData = pageNotifications.map(notif => ({
      id: notif.id,
      displayName: notif.customName || getDisplayType(notif.subscriptionType, notif.subtype).slice(0, 20),
      isActive: notif.enabled
    }));

    const keyboard = notificationListKeyboard(keyboardData, currentPage, totalPages);

    if (ctx.callbackQuery) {
      try {
        await ctx.editMessageText(message, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
      } catch (error: any) {
        if (!error.description?.includes('message is not modified')) {
          await ctx.reply(message, { parse_mode: 'Markdown', reply_markup: keyboard });
        }
      }
    } else {
      await ctx.reply(message, { parse_mode: 'Markdown', reply_markup: keyboard });
    }

    pushNavigationState(userId, 'notification_list', { page: currentPage });
  } catch (error) {
    logger('Error in showNotificationList:', error);
    await ctx.reply('⚠️ Произошла ошибка при загрузке списка.');
  }
}

// ==================== ДЕТАЛИ ПОДПИСКИ ====================

/**
 * Показать детали подписки
 */
async function showNotificationDetail(ctx: Context, notificationId: number): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  try {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
      include: { location: true, user: true }
    });

    if (!notification) {
      await ctx.answerCallbackQuery('❌ Подписка не найдена');
      return;
    }

    // Проверка прав доступа
    if (notification.user?.telegramId !== userId.toString()) {
      await ctx.answerCallbackQuery('❌ Нет доступа');
      return;
    }

    const status = notification.enabled ? '✅ Активна' : '⏸️ Приостановлена';
    const displayType = getDisplayType(notification.subscriptionType, notification.subtype);
    const cityName = notification.location?.name || 'Неизвестный город';
    const schedule = getDisplaySchedule(notification.schedule);

    let message = `📄 *Подписка #${notification.id}*\n\n`;
    message += `📌 Тип: ${displayType}\n`;
    message += `📍 Город: ${cityName}\n`;
    message += `${status}\n`;
    message += `📅 Создана: ${notification.createdAt.toLocaleDateString('ru-RU')}\n\n`;

    if (notification.subscriptionType === 'regular_forecast') {
      const params = parseParameters<RegularForecastParams>(notification.parameters);
      message += `⏰ Время: ${params.time || '—'}\n`;
      message += `🔄 Частота: ${schedule}\n`;

      if (notification.nextNotification) {
        message += `⏱️ Следующее: ${notification.nextNotification.toLocaleString('ru-RU')}\n`;
      }

      if (notification.schedule === 'once' && params.targetDate) {
        message += `📅 Дата: ${params.targetDate}\n`;
      }
    } else {
      // Погодное событие
      if (notification.subtype === 'temperature_change') {
        const params = parseParameters<TemperatureEventParams>(notification.parameters);
        const directionText = {
          decrease: 'Похолодание',
          increase: 'Потепление',
          any: 'Любое изменение'
        }[params.direction || 'any'];
        message += `🌡️ Условие: ${directionText} на ${params.threshold || 5}°C\n`;
        message += `🔍 Проверка: каждые ${params.checkIntervalHours || 2} ч\n`;
      } else if (notification.subtype === 'precipitation') {
        const params = parseParameters<PrecipitationEventParams>(notification.parameters);
        const precipText = {
          rain: 'Дождь',
          snow: 'Снег',
          any: 'Любые осадки'
        }[params.precipitationType || 'any'];
        const eventText = params.eventType === 'end' ? 'Окончание' : 'Начало';
        message += `🌧️ Условие: ${eventText} — ${precipText}\n`;
        message += `🔍 Проверка: каждые ${params.checkIntervalHours || 2} ч\n`;
      } else if (notification.subtype === 'wind') {
        const params = parseParameters<WindEventParams>(notification.parameters);
        message += `💨 Условие: ветер > ${params.threshold || 10} м/с\n`;
        message += `🔍 Проверка: каждые ${params.checkIntervalHours || 2} ч\n`;
      }

      if (notification.lastChecked) {
        message += `⏱️ Последняя проверка: ${notification.lastChecked.toLocaleString('ru-RU')}\n`;
      }
    }

    if (notification.customName) {
      message += `\n🏷️ Название: ${notification.customName}`;
    }

    const keyboard = notificationDetailKeyboard(notification.id, notification.enabled);

    if (ctx.callbackQuery) {
      try {
        await ctx.editMessageText(message, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
      } catch (error: any) {
        if (!error.description?.includes('message is not modified')) {
          await ctx.reply(message, { parse_mode: 'Markdown', reply_markup: keyboard });
        }
      }
    } else {
      await ctx.reply(message, { parse_mode: 'Markdown', reply_markup: keyboard });
    }

    pushNavigationState(userId, 'notification_detail', { id: notificationId });
  } catch (error) {
    logger('Error in showNotificationDetail:', error);
    await ctx.reply('⚠️ Произошла ошибка при загрузке деталей.');
  }
}

// ==================== СОЗДАНИЕ ПОДПИСКИ ====================

/**
 * Начать создание подписки
 */
async function startNotificationCreate(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  // Инициализируем состояние
  setFlowState(userId, {
    flow: 'notification_create',
    step: 'type',
    data: {},
    updatedAt: Date.now(),
    expiresAt: Date.now() + 10 * 60 * 1000
  } as NotificationFlowState);

  const message = `🔔 *Создание подписки*

Выберите тип уведомления:

📅 *Регулярный прогноз* — получайте прогноз по расписанию (ежедневно, по будням и т.д.)

⚡ *Погодные события* — уведомления об изменениях температуры, осадках, ветре`;

  const keyboard = notifCreateTypeKeyboard();

  if (ctx.callbackQuery) {
    try {
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    } catch (error: any) {
      if (!error.description?.includes('message is not modified')) {
        await ctx.reply(message, { parse_mode: 'Markdown', reply_markup: keyboard });
      }
    }
  } else {
    await ctx.reply(message, { parse_mode: 'Markdown', reply_markup: keyboard });
  }
}

/**
 * Показать выбор подтипа (прогноз или событие)
 */
async function showSubtypeSelection(ctx: Context, subscriptionType: SubscriptionType): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  const state = getFlowState(userId) as NotificationFlowState | undefined;
  if (!state || state.flow !== 'notification_create') {
    await ctx.reply('Сессия истекла. Начните создание заново.');
    return;
  }

  // Обновляем состояние
  state.data.subscriptionType = subscriptionType;
  state.step = 'subtype';
  setFlowState(userId, state);

  let message: string;
  let keyboard;

  if (subscriptionType === 'regular_forecast') {
    message = `📅 *Какой прогноз отправлять?*

Выберите тип прогноза:`;
    keyboard = notifCreateForecastSubtypeKeyboard();
  } else {
    message = `⚡ *На какое событие подписаться?*

Выберите тип события:`;
    keyboard = notifCreateEventSubtypeKeyboard();
  }

  try {
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  } catch (error: any) {
    if (!error.description?.includes('message is not modified')) {
      await ctx.reply(message, { parse_mode: 'Markdown', reply_markup: keyboard });
    }
  }
}

/**
 * Показать выбор города
 */
async function showCitySelection(ctx: Context, subtype: string): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  const state = getFlowState(userId) as NotificationFlowState | undefined;
  if (!state || state.flow !== 'notification_create') {
    await ctx.reply('Сессия истекла. Начните создание заново.');
    return;
  }

  // Обновляем состояние
  state.data.subtype = subtype;
  state.step = 'city';
  setFlowState(userId, state);

  // Получаем последние города пользователя
  const telegramId = userId.toString();
  const user = await getOrCreateUser(telegramId, ctx.from?.language_code);
  
  const locations = await prisma.location.findMany({
    where: { userId: user.id },
    orderBy: { id: 'desc' },
    take: 3
  });

  const message = `📍 *Для какого города?*

${locations.length > 0 ? 'Выберите из недавних или введите новый:' : 'Введите название города или отправьте геолокацию:'}`;

  const recentCities = locations.map(loc => ({ id: loc.id, name: loc.name }));
  const keyboard = notifCreateCityKeyboard(recentCities);

  try {
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  } catch (error: any) {
    if (!error.description?.includes('message is not modified')) {
      await ctx.reply(message, { parse_mode: 'Markdown', reply_markup: keyboard });
    }
  }
}

/**
 * Обработать выбор города
 */
async function handleCitySelection(ctx: Context, cityId: number): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  const state = getFlowState(userId) as NotificationFlowState | undefined;
  if (!state || state.flow !== 'notification_create') {
    await ctx.reply('Сессия истекла. Начните создание заново.');
    return;
  }

  const location = await prisma.location.findUnique({ where: { id: cityId } });
  if (!location) {
    await ctx.answerCallbackQuery('❌ Город не найден');
    return;
  }

  state.data.cityId = location.id;
  state.data.cityName = location.name;
  setFlowState(userId, state);

  // Переходим к следующему шагу в зависимости от типа
  if (state.data.subscriptionType === 'regular_forecast') {
    await showTimeSelection(ctx);
  } else {
    // Для погодных событий показываем настройки параметров
    await showEventParameterSelection(ctx);
  }
}

/**
 * Показать выбор времени
 */
async function showTimeSelection(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  const state = getFlowState(userId) as NotificationFlowState | undefined;
  if (!state || state.flow !== 'notification_create') return;

  state.step = 'time';
  setFlowState(userId, state);

  const message = `⏰ *Во сколько присылать?*

Выберите время или введите своё (например: 9:30):`;

  const keyboard = notifCreateTimeKeyboard();

  try {
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  } catch (error: any) {
    if (!error.description?.includes('message is not modified')) {
      await ctx.reply(message, { parse_mode: 'Markdown', reply_markup: keyboard });
    }
  }
}

/**
 * Обработать выбор времени
 */
async function handleTimeSelection(ctx: Context, time: string): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  const state = getFlowState(userId) as NotificationFlowState | undefined;
  if (!state || state.flow !== 'notification_create') return;

  state.data.time = time;
  state.step = 'frequency';
  setFlowState(userId, state);

  await showFrequencySelection(ctx);
}

/**
 * Показать выбор частоты
 */
async function showFrequencySelection(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  const state = getFlowState(userId) as NotificationFlowState | undefined;
  if (!state || state.flow !== 'notification_create') return;

  state.step = 'frequency';
  setFlowState(userId, state);

  const message = `🔄 *Как часто присылать?*

Выберите расписание:`;

  const keyboard = notifCreateFrequencyKeyboard();

  try {
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  } catch (error: any) {
    if (!error.description?.includes('message is not modified')) {
      await ctx.reply(message, { parse_mode: 'Markdown', reply_markup: keyboard });
    }
  }
}

/**
 * Обработать выбор частоты
 */
async function handleFrequencySelection(ctx: Context, schedule: ScheduleType): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  const state = getFlowState(userId) as NotificationFlowState | undefined;
  if (!state || state.flow !== 'notification_create') return;

  state.data.schedule = schedule;
  state.step = 'confirm';
  setFlowState(userId, state);

  await showConfirmation(ctx);
}

/**
 * Показать настройки параметров события
 */
async function showEventParameterSelection(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  const state = getFlowState(userId) as NotificationFlowState | undefined;
  if (!state || state.flow !== 'notification_create') return;

  const subtype = state.data.subtype;

  if (subtype === 'temperature_change') {
    state.step = 'temp_direction';
    setFlowState(userId, state);

    const message = `🌡️ *Какое изменение температуры?*

Выберите направление изменения:`;

    const keyboard = notifCreateTempDirectionKeyboard();
    await ctx.editMessageText(message, { parse_mode: 'Markdown', reply_markup: keyboard });
  } else if (subtype === 'precipitation') {
    state.step = 'precip_type';
    setFlowState(userId, state);

    const message = `🌧️ *Какие осадки отслеживать?*

Выберите тип осадков:`;

    const keyboard = notifCreatePrecipTypeKeyboard();
    await ctx.editMessageText(message, { parse_mode: 'Markdown', reply_markup: keyboard });
  } else if (subtype === 'wind') {
    state.step = 'wind_threshold';
    setFlowState(userId, state);

    const message = `💨 *При какой скорости ветра уведомлять?*

Выберите порог:`;

    const keyboard = notifCreateWindThresholdKeyboard();
    await ctx.editMessageText(message, { parse_mode: 'Markdown', reply_markup: keyboard });
  }
}

/**
 * Обработать параметр события
 */
async function handleEventParameter(ctx: Context, value: string, paramType: string): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  const state = getFlowState(userId) as NotificationFlowState | undefined;
  if (!state || state.flow !== 'notification_create') return;

  switch (paramType) {
    case 'direction':
      state.data.tempDirection = value as 'increase' | 'decrease' | 'any';
      state.step = 'temp_threshold';
      setFlowState(userId, state);
      
      const thresholdMsg = `📉 *На сколько градусов?*\n\nВыберите порог изменения:`;
      await ctx.editMessageText(thresholdMsg, {
        parse_mode: 'Markdown',
        reply_markup: notifCreateTempThresholdKeyboard()
      });
      break;

    case 'threshold':
      state.data.tempThreshold = parseInt(value);
      state.step = 'check_interval';
      setFlowState(userId, state);
      await showCheckIntervalSelection(ctx);
      break;

    case 'precip_type':
      state.data.precipType = value as 'rain' | 'snow' | 'any';
      state.step = 'precip_event';
      setFlowState(userId, state);

      const precipEventMsg = `🔄 *Что отслеживать?*\n\nВыберите событие:`;
      await ctx.editMessageText(precipEventMsg, {
        parse_mode: 'Markdown',
        reply_markup: notifCreatePrecipEventKeyboard()
      });
      break;

    case 'precip_event':
      state.data.precipEvent = value as 'start' | 'end';
      state.step = 'check_interval';
      setFlowState(userId, state);
      await showCheckIntervalSelection(ctx);
      break;

    case 'wind_threshold':
      state.data.windThreshold = parseInt(value);
      state.step = 'check_interval';
      setFlowState(userId, state);
      await showCheckIntervalSelection(ctx);
      break;

    case 'check_interval':
      state.data.checkInterval = parseInt(value);
      state.step = 'confirm';
      setFlowState(userId, state);
      await showConfirmation(ctx);
      break;
  }
}

/**
 * Показать выбор интервала проверки
 */
async function showCheckIntervalSelection(ctx: Context): Promise<void> {
  const message = `🔍 *Как часто проверять условия?*

Чем чаще, тем оперативнее уведомление:`;

  const keyboard = notifCreateCheckIntervalKeyboard();

  try {
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  } catch (error: any) {
    if (!error.description?.includes('message is not modified')) {
      await ctx.reply(message, { parse_mode: 'Markdown', reply_markup: keyboard });
    }
  }
}

/**
 * Показать подтверждение
 */
async function showConfirmation(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  const state = getFlowState(userId) as NotificationFlowState | undefined;
  if (!state || state.flow !== 'notification_create') return;

  const data = state.data;
  let message = `✅ *Подписка готова к созданию!*\n\n`;

  if (data.subscriptionType === 'regular_forecast') {
    const forecastType = getDisplayType('regular_forecast', data.subtype || 'today');
    const schedule = getDisplaySchedule(data.schedule || 'daily');

    message += `📌 Тип: ${forecastType}\n`;
    message += `📍 Город: ${data.cityName || 'Неизвестно'}\n`;
    message += `⏰ Время: ${data.time || '—'}\n`;
    message += `🔄 Частота: ${schedule}\n`;
  } else {
    const eventType = getDisplayType('weather_event', data.subtype || '');
    message += `📌 Тип: ${eventType}\n`;
    message += `📍 Город: ${data.cityName || 'Неизвестно'}\n`;

    if (data.subtype === 'temperature_change') {
      const directionText = {
        decrease: 'Похолодание',
        increase: 'Потепление',
        any: 'Любое изменение'
      }[data.tempDirection || 'any'];
      message += `🌡️ Условие: ${directionText} на ${data.tempThreshold || 5}°C\n`;
    } else if (data.subtype === 'precipitation') {
      const precipText = {
        rain: 'Дождь',
        snow: 'Снег',
        any: 'Любые осадки'
      }[data.precipType || 'any'];
      const eventText = data.precipEvent === 'end' ? 'Окончание' : 'Начало';
      message += `🌧️ Условие: ${eventText} — ${precipText}\n`;
    } else if (data.subtype === 'wind') {
      message += `💨 Условие: ветер > ${data.windThreshold || 10} м/с\n`;
    }

    message += `🔍 Проверка: каждые ${data.checkInterval || 2} ч\n`;
  }

  if (data.customName) {
    message += `\n🏷️ Название: ${data.customName}`;
  }

  const keyboard = notifCreateConfirmKeyboard();

  try {
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  } catch (error: any) {
    if (!error.description?.includes('message is not modified')) {
      await ctx.reply(message, { parse_mode: 'Markdown', reply_markup: keyboard });
    }
  }
}

/**
 * Завершить создание подписки
 */
async function finalizeNotificationCreate(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  const state = getFlowState(userId) as NotificationFlowState | undefined;
  if (!state || state.flow !== 'notification_create') {
    await ctx.reply('Сессия истекла. Начните создание заново.');
    return;
  }

  try {
    const telegramId = userId.toString();
    const user = await getOrCreateUser(telegramId, ctx.from?.language_code);
    const data = state.data;

    if (!data.cityId || !data.subscriptionType || !data.subtype) {
      await ctx.reply('⚠️ Не все данные заполнены. Начните создание заново.');
      clearFlowState(userId);
      return;
    }

    // Формируем параметры
    let parameters: RegularForecastParams | TemperatureEventParams | PrecipitationEventParams | WindEventParams;

    if (data.subscriptionType === 'regular_forecast') {
      parameters = {
        time: data.time || '08:00',
        targetDate: data.schedule === 'once' ? new Date().toISOString().split('T')[0] : undefined
      };
    } else if (data.subtype === 'temperature_change') {
      parameters = {
        direction: data.tempDirection || 'any',
        threshold: data.tempThreshold || 5,
        checkIntervalHours: data.checkInterval || 2
      };
    } else if (data.subtype === 'precipitation') {
      parameters = {
        precipitationType: data.precipType || 'any',
        eventType: data.precipEvent || 'start',
        checkIntervalHours: data.checkInterval || 2
      };
    } else {
      parameters = {
        threshold: data.windThreshold || 10,
        checkIntervalHours: data.checkInterval || 2
      };
    }

    // Создаём уведомление через сервис
    const notificationService = getNotificationService();
    const notificationId = await notificationService.createNotification({
      userId: user.id,
      chatId: userId,
      locationId: data.cityId,
      subscriptionType: data.subscriptionType,
      subtype: data.subtype,
      parameters,
      schedule: data.schedule || 'daily',
      customName: data.customName
    });

    clearFlowState(userId);

    const displayType = getDisplayType(data.subscriptionType, data.subtype);
    let successMessage = `✅ *Подписка создана!*\n\n`;
    successMessage += `📌 Тип: ${displayType}\n`;
    successMessage += `📍 Город: ${data.cityName}\n`;

    if (data.subscriptionType === 'regular_forecast') {
      successMessage += `⏰ Время: ${data.time || '—'}\n`;
      successMessage += `🔄 Частота: ${getDisplaySchedule(data.schedule || 'daily')}\n`;
    } else {
      successMessage += `🔍 Проверка: каждые ${data.checkInterval || 2} ч\n`;
    }

    successMessage += `\n_Вы будете получать уведомления согласно настроенному расписанию._`;

    const keyboard = notifCreateSuccessKeyboard();

    try {
      await ctx.editMessageText(successMessage, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    } catch (error: any) {
      await ctx.reply(successMessage, { parse_mode: 'Markdown', reply_markup: keyboard });
    }

    logger(`User ${userId} created notification ${notificationId}`);
  } catch (error) {
    logger('Error creating notification:', error);
    await ctx.reply('⚠️ Произошла ошибка при создании подписки.');
    clearFlowState(userId);
  }
}

/**
 * Отменить создание
 */
async function cancelNotificationCreate(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  clearFlowState(userId);
  await showNotificationMain(ctx);
}

// ==================== УПРАВЛЕНИЕ ПОДПИСКАМИ ====================

/**
 * Переключить состояние подписки
 */
async function toggleNotification(ctx: Context, notificationId: number): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  try {
    const notificationService = getNotificationService();
    const success = await notificationService.toggleNotification(notificationId);

    if (success) {
      await ctx.answerCallbackQuery('✅ Статус изменён');
      await showNotificationDetail(ctx, notificationId);
    } else {
      await ctx.answerCallbackQuery('❌ Не удалось изменить статус');
    }
  } catch (error) {
    logger('Error toggling notification:', error);
    await ctx.answerCallbackQuery('⚠️ Произошла ошибка');
  }
}

/**
 * Показать подтверждение удаления
 */
async function showDeleteConfirmation(ctx: Context, notificationId: number): Promise<void> {
  const message = `❓ *Удалить подписку?*\n\nЭто действие нельзя отменить.`;
  const keyboard = notificationDeleteConfirmKeyboard(notificationId);

  try {
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  } catch (error: any) {
    if (!error.description?.includes('message is not modified')) {
      await ctx.reply(message, { parse_mode: 'Markdown', reply_markup: keyboard });
    }
  }
}

/**
 * Удалить подписку
 */
async function deleteNotification(ctx: Context, notificationId: number): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  try {
    const notificationService = getNotificationService();
    const success = await notificationService.deleteNotification(notificationId);

    if (success) {
      await ctx.answerCallbackQuery('✅ Подписка удалена');
      await showNotificationList(ctx);
    } else {
      await ctx.answerCallbackQuery('❌ Не удалось удалить');
    }
  } catch (error) {
    logger('Error deleting notification:', error);
    await ctx.answerCallbackQuery('⚠️ Произошла ошибка');
  }
}

/**
 * Отправить тестовое уведомление
 */
async function sendTestNotification(ctx: Context, notificationId: number): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  try {
    await ctx.answerCallbackQuery('🔔 Отправляю тестовое уведомление...');

    const notificationService = getNotificationService();
    const success = await notificationService.sendTestNotification(notificationId);

    if (!success) {
      await ctx.reply('⚠️ Не удалось отправить тестовое уведомление.');
    }
  } catch (error) {
    logger('Error sending test notification:', error);
    await ctx.reply('⚠️ Произошла ошибка при отправке.');
  }
}

// ==================== ОБРАБОТЧИКИ ТЕКСТОВОГО ВВОДА ====================

/**
 * Обработать текстовый ввод во время создания уведомления
 */
async function handleTextInput(ctx: Context): Promise<boolean> {
  const userId = ctx.from?.id;
  if (!userId) return false;

  const state = getFlowState(userId) as NotificationFlowState | undefined;
  if (!state || state.flow !== 'notification_create') return false;

  const text = ctx.message?.text?.trim();
  if (!text) return false;

  switch (state.step) {
    case 'city_input': {
      // Обработка ввода города
      const { geocodeCity } = await import('../utils/geocoding');
      const location = geocodeCity(text);
      
      if (!location) {
        await ctx.reply(`Город "${text}" не найден. Попробуйте другой город.`);
        return true;
      }

      // Сохраняем или создаём локацию
      const telegramId = userId.toString();
      const user = await getOrCreateUser(telegramId, ctx.from?.language_code);

      let savedLocation = await prisma.location.findFirst({
        where: { userId: user.id, name: location.name }
      });

      if (!savedLocation) {
        savedLocation = await prisma.location.create({
          data: {
            name: location.name,
            latitude: location.latitude,
            longitude: location.longitude,
            userId: user.id
          }
        });
      }

      state.data.cityId = savedLocation.id;
      state.data.cityName = savedLocation.name;
      setFlowState(userId, state);

      await ctx.reply(`✅ Город выбран: ${savedLocation.name}`);

      if (state.data.subscriptionType === 'regular_forecast') {
        await showTimeSelection(ctx);
      } else {
        await showEventParameterSelection(ctx);
      }
      return true;
    }

    case 'time_input': {
      // Обработка ввода времени
      const timeRegex = /^(\d{1,2}):(\d{2})$/;
      const match = text.match(timeRegex);
      
      if (!match) {
        await ctx.reply('Неверный формат времени. Введите в формате ЧЧ:MM (например: 9:30)');
        return true;
      }

      const hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);

      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        await ctx.reply('Неверное время. Часы: 0-23, минуты: 0-59.');
        return true;
      }

      const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      state.data.time = formattedTime;
      state.step = 'frequency';
      setFlowState(userId, state);

      await ctx.reply(`✅ Время установлено: ${formattedTime}`);
      await showFrequencySelection(ctx);
      return true;
    }

    case 'name_input': {
      // Обработка ввода названия
      state.data.customName = text.slice(0, 50);
      state.step = 'confirm';
      setFlowState(userId, state);

      await ctx.reply(`✅ Название: ${state.data.customName}`);
      await showConfirmation(ctx);
      return true;
    }

    case 'temp_threshold_input': {
      const threshold = parseFloat(text);
      if (isNaN(threshold) || threshold <= 0) {
        await ctx.reply('Введите положительное число (например: 5)');
        return true;
      }

      state.data.tempThreshold = threshold;
      state.step = 'check_interval';
      setFlowState(userId, state);

      await ctx.reply(`✅ Порог: ${threshold}°C`);
      await showCheckIntervalSelection(ctx);
      return true;
    }

    case 'wind_threshold_input': {
      const threshold = parseFloat(text);
      if (isNaN(threshold) || threshold <= 0) {
        await ctx.reply('Введите положительное число (например: 10)');
        return true;
      }

      state.data.windThreshold = threshold;
      state.step = 'check_interval';
      setFlowState(userId, state);

      await ctx.reply(`✅ Порог: ${threshold} м/с`);
      await showCheckIntervalSelection(ctx);
      return true;
    }

    case 'check_interval_input': {
      const interval = parseFloat(text);
      if (isNaN(interval) || interval < 0.5) {
        await ctx.reply('Минимальный интервал: 0.5 часа (30 минут)');
        return true;
      }

      state.data.checkInterval = interval;
      state.step = 'confirm';
      setFlowState(userId, state);

      await ctx.reply(`✅ Интервал проверки: ${interval} ч`);
      await showConfirmation(ctx);
      return true;
    }
  }

  return false;
}

// ==================== РЕГИСТРАЦИЯ ОБРАБОТЧИКОВ ====================

/**
 * Регистрация всех обработчиков уведомлений
 */
export function registerNotificationHandlers(bot: Bot<Context>): void {
  // Команда /notifications
  bot.command('notifications', async (ctx) => {
    await showNotificationMain(ctx);
  });

  // Главные callback-запросы уведомлений
  bot.callbackQuery(/^notification:/, async (ctx) => {
    try {
      await ctx.answerCallbackQuery();
    } catch (error: any) {
      if (error.description?.includes('query is too old')) return;
    }

    const data = ctx.callbackQuery.data ?? '';
    const parsed = NotificationCallback.parse(data);
    if (!parsed) return;

    const { action, id, param1 } = parsed;

    switch (action) {
      case 'main':
        await showNotificationMain(ctx);
        break;
      case 'list':
        await showNotificationList(ctx, id || 0);
        break;
      case 'add':
        await startNotificationCreate(ctx);
        break;
      case 'detail':
        if (id) await showNotificationDetail(ctx, id);
        break;
      case 'toggle':
        if (id) await toggleNotification(ctx, id);
        break;
      case 'delete':
        if (id) await showDeleteConfirmation(ctx, id);
        break;
      case 'delete_confirm':
        if (id) await deleteNotification(ctx, id);
        break;
      case 'test':
        if (id) await sendTestNotification(ctx, id);
        break;
    }
  });

  // Callback-запросы создания уведомления
  bot.callbackQuery(/^notif_create:/, async (ctx) => {
    try {
      await ctx.answerCallbackQuery();
    } catch (error: any) {
      if (error.description?.includes('query is too old')) return;
    }

    const data = ctx.callbackQuery.data ?? '';
    const parsed = NotifCreateCallback.parse(data);
    if (!parsed) return;

    const { step, value, extra } = parsed;

    switch (step) {
      case 'type':
        if (value === 'regular_forecast' || value === 'weather_event') {
          await showSubtypeSelection(ctx, value);
        }
        break;

      case 'subtype':
        if (value) await showCitySelection(ctx, value);
        break;

      case 'city':
        if (value === 'custom') {
          const userId = ctx.from?.id;
          if (userId) {
            const state = getFlowState(userId) as NotificationFlowState | undefined;
            if (state) {
              state.step = 'city_input';
              setFlowState(userId, state);
            }
          }
          await ctx.reply('📍 Введите название города:');
        } else if (value === 'location') {
          await ctx.reply('📍 Отправьте геолокацию через кнопку 📍 в поле ввода.');
        } else if (value) {
          await handleCitySelection(ctx, parseInt(value));
        }
        break;

      case 'time':
        if (value === 'custom') {
          const userId = ctx.from?.id;
          if (userId) {
            const state = getFlowState(userId) as NotificationFlowState | undefined;
            if (state) {
              state.step = 'time_input';
              setFlowState(userId, state);
            }
          }
          await ctx.reply('⏰ Введите время в формате ЧЧ:MM (например: 9:30):');
        } else if (value) {
          await handleTimeSelection(ctx, value);
        }
        break;

      case 'frequency':
        if (value) await handleFrequencySelection(ctx, value as ScheduleType);
        break;

      case 'event_param':
        if (value && extra) {
          if (value === 'custom') {
            const userId = ctx.from?.id;
            if (userId) {
              const state = getFlowState(userId) as NotificationFlowState | undefined;
              if (state) {
                if (extra === 'threshold') state.step = 'temp_threshold_input';
                else if (extra === 'wind_threshold') state.step = 'wind_threshold_input';
                else if (extra === 'check_interval') state.step = 'check_interval_input';
                setFlowState(userId, state);
              }
            }
            await ctx.reply('✏️ Введите значение:');
          } else {
            await handleEventParameter(ctx, value, extra);
          }
        }
        break;

      case 'confirm':
        await finalizeNotificationCreate(ctx);
        break;

      case 'name':
        {
          const userId = ctx.from?.id;
          if (userId) {
            const state = getFlowState(userId) as NotificationFlowState | undefined;
            if (state) {
              state.step = 'name_input';
              setFlowState(userId, state);
            }
          }
          await ctx.reply('🏷️ Введите название подписки (до 50 символов):');
        }
        break;

      case 'cancel':
        await cancelNotificationCreate(ctx);
        break;

      case 'back':
        // Обработка кнопки "Назад"
        {
          const userId = ctx.from?.id;
          if (!userId) break;

          const state = getFlowState(userId) as NotificationFlowState | undefined;
          if (!state) {
            await showNotificationMain(ctx);
            break;
          }

          switch (value) {
            case 'type':
              await startNotificationCreate(ctx);
              break;
            case 'subtype':
              if (state.data.subscriptionType) {
                await showSubtypeSelection(ctx, state.data.subscriptionType);
              }
              break;
            case 'city':
              if (state.data.subtype) {
                await showCitySelection(ctx, state.data.subtype);
              }
              break;
            case 'time':
              await showTimeSelection(ctx);
              break;
            case 'frequency':
              await showFrequencySelection(ctx);
              break;
            case 'temp_direction':
              await showEventParameterSelection(ctx);
              break;
            case 'temp_threshold':
              state.step = 'temp_direction';
              setFlowState(userId, state);
              await ctx.editMessageText('🌡️ *Какое изменение температуры?*', {
                parse_mode: 'Markdown',
                reply_markup: notifCreateTempDirectionKeyboard()
              });
              break;
            case 'precip_type':
              await showEventParameterSelection(ctx);
              break;
            case 'event_param':
              await showEventParameterSelection(ctx);
              break;
            default:
              await showNotificationMain(ctx);
          }
        }
        break;
    }
  });

  // Обработчик навигации к главному меню
  bot.callbackQuery(/^nav:main_menu$/, async (ctx) => {
    try {
      await ctx.answerCallbackQuery();
    } catch (error: any) {
      if (error.description?.includes('query is too old')) return;
    }

    const userId = ctx.from?.id;
    if (userId) clearFlowState(userId);

    await ctx.editMessageText(MAIN_MENU_TEXT, {
      parse_mode: 'Markdown',
      reply_markup: mainMenuKeyboard()
    });
  });

  // Обработчик геолокации во время создания уведомления
  bot.on('message:location', async (ctx, next) => {
    const userId = ctx.from?.id;
    if (!userId) {
      await next();
      return;
    }

    const state = getFlowState(userId) as NotificationFlowState | undefined;
    if (!state || state.flow !== 'notification_create' || state.step !== 'city') {
      await next();
      return;
    }

    const loc = ctx.message.location;
    const telegramId = userId.toString();
    const user = await getOrCreateUser(telegramId, ctx.from?.language_code);

    // Создаём локацию
    const location = await prisma.location.create({
      data: {
        name: 'Моя геолокация',
        latitude: loc.latitude,
        longitude: loc.longitude,
        userId: user.id
      }
    });

    state.data.cityId = location.id;
    state.data.cityName = location.name;
    setFlowState(userId, state);

    await ctx.reply(`✅ Локация сохранена: ${location.name}`);

    if (state.data.subscriptionType === 'regular_forecast') {
      await showTimeSelection(ctx);
    } else {
      await showEventParameterSelection(ctx);
    }
  });

  // Обработчик текстовых сообщений во время создания уведомления
  bot.on('message:text', async (ctx, next) => {
    const handled = await handleTextInput(ctx);
    if (!handled) {
      await next();
    }
  });
}

