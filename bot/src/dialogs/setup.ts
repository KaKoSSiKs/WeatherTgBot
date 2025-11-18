import type { Bot, Context } from 'grammy';
import { InlineKeyboard } from 'grammy';
import { prisma } from '../db/prisma';
import { getOrCreateUser } from '../db/user';
import {
  DEFAULT_CITY,
  geocodeCity,
  GeocodedLocation
} from '../utils/geocoding';
import {
  locationQuickPickKeyboard,
  locationShareKeyboard,
  notificationTypeKeyboard,
  timePickerKeyboard
} from '../keyboards';
import type { FlowType, FlowState, SetupStep } from '../state/session';
import { clearFlowState, getFlowState, setFlowState } from '../state/session';
import { logger } from '../utils/logger';

export type SetupData = {
  locationName?: string;
  latitude?: number;
  longitude?: number;
  notificationType?: string;
  time?: string | null;
  days?: string | null;
};

function ensureUser(ctx: Context): number | null {
  const telegramId = ctx.from?.id;
  if (!telegramId) {
    ctx.reply('Не удалось определить пользователя. Попробуйте позже.');
    return null;
  }
  return telegramId;
}

async function promptLocation(ctx: Context, flow: FlowType) {
  await ctx.reply(
    flow === 'setup'
      ? 'Начнём с локации. Выберите город из списка или отправьте свою геопозицию.'
      : 'Где нужно присылать погоду? Выберите город или отправьте свою геопозицию.',
    { reply_markup: locationQuickPickKeyboard() }
  );
  await ctx.reply(
    'Можно отправить локацию кнопкой ниже или ввести город текстом. Используйте /add без параметров для интерактивной настройки.',
    {
    reply_markup: locationShareKeyboard()
    }
  );
}

async function promptPreferences(ctx: Context) {
  await ctx.reply('Как часто присылать уведомления?', {
    reply_markup: notificationTypeKeyboard()
  });
}

function buildConfirmKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('✅ Подтвердить', 'setup:confirm')
    .row()
    .text('⬅️ Назад', 'setup:back:time')
    .text('❌ Отмена', 'setup:cancel');
}

async function promptTime(ctx: Context) {
  await ctx.reply('Выберите время уведомления:', {
    reply_markup: timePickerKeyboard()
  });
}

async function sendConfirmation(ctx: Context, data: SetupData) {
  const summary = [
    'Почти готово! Проверьте настройки:',
    '',
    `Локация: ${data.locationName ?? DEFAULT_CITY.name}`,
    `Тип уведомления: ${translateNotificationType(data.notificationType)}`,
    `Время: ${data.time ? data.time : 'позже'}`,
    '',
    'Сохранить эти настройки?'
  ].join('\n');
  await ctx.reply(summary, { reply_markup: buildConfirmKeyboard() });
}

function translateNotificationType(type?: string): string {
  switch (type) {
    case 'daily':
      return 'Ежедневно';
    case 'weekly':
      return 'По дням недели';
    case 'trigger':
      return 'По событиям';
    default:
      return 'Не выбрано';
  }
}

async function finalizeSetup(ctx: Context, state: FlowState) {
  const telegramId = ensureUser(ctx);
  if (!telegramId) return;

  const user = await getOrCreateUser(telegramId.toString(), ctx.from?.language_code);
  const data = state.data as SetupData;

  const locationName = data.locationName ?? DEFAULT_CITY.name;
  const latitude = data.latitude ?? DEFAULT_CITY.latitude;
  const longitude = data.longitude ?? DEFAULT_CITY.longitude;

  let locationRecord =
    (await prisma.location.findFirst({
      where: { userId: user.id, name: locationName }
    })) ??
    (await prisma.location.create({
      data: {
        name: locationName,
        latitude,
        longitude,
        userId: user.id
      }
    }));

  const notification = await prisma.notification.create({
    data: {
      type: data.notificationType ?? 'daily',
      time: data.time ?? null,
      days: data.notificationType === 'weekly' ? '1,2,3,4,5' : null,
      enabled: true,
      userId: user.id,
      locationId: locationRecord.id
    },
    include: { location: true }
  });

  clearFlowState(telegramId);

  const responseLines = [
    '🎉 Готово! Настройки сохранены.',
    `Локация: ${notification.location?.name}`,
    `Тип: ${translateNotificationType(notification.type)}`,
    `Время: ${notification.time ?? 'позже'}`
  ];

  if (state.flow === 'setup') {
    responseLines.push('', 'Вы всегда можете изменить настройки в меню.');
  } else {
    responseLines.push('', 'Это уведомление появится в /list.');
  }

  await ctx.reply(responseLines.join('\n'), { reply_markup: { remove_keyboard: true } });
}

function updateState(userId: number, updater: (state: FlowState) => FlowState) {
  const state = getFlowState(userId);
  if (!state) return;
  setFlowState(userId, updater(state));
}

function hasLocationData(data: SetupData): boolean {
  return (
    Boolean(data.locationName) &&
    typeof data.latitude === 'number' &&
    typeof data.longitude === 'number'
  );
}

function determineStep(data: SetupData): SetupStep {
  if (!hasLocationData(data)) {
    return 'location';
  }
  if (!data.notificationType) {
    return 'preferences';
  }
  if (Object.prototype.hasOwnProperty.call(data, 'time')) {
    return 'confirm';
  }
  return 'time';
}

async function handleGeocodedLocation(ctx: Context, userId: number, flow: FlowType, location: GeocodedLocation) {
  updateState(userId, (state) => ({
    ...state,
    step: 'preferences',
    data: {
      ...state.data,
      locationName: location.name,
      latitude: location.latitude,
      longitude: location.longitude
    }
  }));
  await ctx.reply(`Локация выбрана: ${location.name}`, { reply_markup: { remove_keyboard: true } });
  const state = getFlowState(userId);
  const data = state?.data as SetupData | undefined;
  if (data?.notificationType) {
    await handleNotificationType(ctx, userId, data.notificationType);
    return;
  }
  await promptPreferences(ctx);
}

async function handleNotificationType(ctx: Context, userId: number, type: string) {
  updateState(userId, (state) => ({
    ...state,
    step: 'time',
    data: { ...state.data, notificationType: type }
  }));
  await ctx.reply(`Тип уведомлений: ${translateNotificationType(type)}.`);
  const state = getFlowState(userId);
  const data = state?.data as SetupData | undefined;
  if (data && Object.prototype.hasOwnProperty.call(data, 'time')) {
    await handleTimeSelection(ctx, userId, data.time ?? null);
    return;
  }
  await promptTime(ctx);
}

async function handleTimeSelection(ctx: Context, userId: number, time: string | null) {
  updateState(userId, (state) => ({
    ...state,
    step: 'confirm',
    data: { ...(state.data as SetupData), time }
  }));
  const state = getFlowState(userId);
  if (state) {
    await sendConfirmation(ctx, state.data as SetupData);
  }
}

async function handleBack(ctx: Context, userId: number, targetStep: SetupStep) {
  updateState(userId, (state) => ({
    ...state,
    step: targetStep
  }));

  switch (targetStep) {
    case 'location':
      await promptLocation(ctx, getFlowState(userId)?.flow ?? 'setup');
      break;
    case 'preferences':
      await promptPreferences(ctx);
      break;
    case 'time':
      await promptTime(ctx);
      break;
    case 'confirm':
      await sendConfirmation(ctx, (getFlowState(userId)?.data as SetupData) ?? {});
      break;
    default:
      break;
  }
}

async function cancelFlow(ctx: Context) {
  const userId = ctx.from?.id;
  if (!userId) return;
  clearFlowState(userId);
  await ctx.reply('Настройка отменена.', {
    reply_markup: { remove_keyboard: true }
  });
}

async function handleTextDuringLocation(ctx: Context, userId: number, text: string) {
  const geocoded = geocodeCity(text);
  if (!geocoded) {
    await ctx.reply(`Местоположение "${text}" не найдено. Попробуйте другой город.`);
    return true;
  }
  await handleGeocodedLocation(ctx, userId, getFlowState(userId)?.flow ?? 'setup', geocoded);
  return true;
}

async function handleSharedLocation(ctx: Context, userId: number) {
  const loc = ctx.message?.location;
  if (!loc) return false;
  updateState(userId, (state) => ({
    ...state,
    step: 'preferences',
    data: {
      ...state.data,
      locationName: 'Моя геолокация',
      latitude: loc.latitude,
      longitude: loc.longitude
    }
  }));
  await ctx.reply('Локация по геопозиции сохранена.', { reply_markup: { remove_keyboard: true } });
  const state = getFlowState(userId);
  const data = state?.data as SetupData | undefined;
  if (data?.notificationType) {
    await handleNotificationType(ctx, userId, data.notificationType);
    return true;
  }
  await promptPreferences(ctx);
  return true;
}

export async function startSetupWizard(
  ctx: Context,
  flow: FlowType = 'setup',
  initialData: Partial<SetupData> = {}
) {
  const userId = ensureUser(ctx);
  if (!userId) return;
  const data: SetupData = { ...initialData };
  const step = determineStep(data);
  setFlowState(userId, {
    flow,
    step,
    data,
    updatedAt: Date.now(),
    expiresAt: Date.now()
  });

  switch (step) {
    case 'location':
      await promptLocation(ctx, flow);
      break;
    case 'preferences':
      await ctx.reply(`Используем локацию: ${data.locationName ?? DEFAULT_CITY.name}`);
      await promptPreferences(ctx);
      break;
    case 'time':
      await ctx.reply(`Локация: ${data.locationName ?? DEFAULT_CITY.name}`);
      await promptTime(ctx);
      break;
    case 'confirm':
      await sendConfirmation(ctx, data);
      break;
    default:
      await promptLocation(ctx, flow);
      break;
  }
}

export function registerSetupDialog(bot: Bot<Context>) {
  bot.callbackQuery(/^setup:/, async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;
    const data = ctx.callbackQuery.data ?? '';
    await ctx.answerCallbackQuery();
    const [, action, payload] = data.split(':');

    switch (action) {
      case 'city': {
        const location = geocodeCity(payload);
        if (!location) {
          await ctx.reply('Не удалось определить город. Попробуйте снова.');
          return;
        }
        await handleGeocodedLocation(ctx, userId, getFlowState(userId)?.flow ?? 'setup', location);
        break;
      }
      case 'type': {
        await handleNotificationType(ctx, userId, payload);
        break;
      }
      case 'time': {
        const timeValue = payload === 'later' ? null : payload;
        await handleTimeSelection(ctx, userId, timeValue);
        break;
      }
      case 'confirm': {
        const state = getFlowState(userId);
        if (!state) {
          await ctx.reply('Сессия истекла. Начните настройку заново.');
          return;
        }
        await finalizeSetup(ctx, state);
        break;
      }
      case 'back': {
        const target = payload as SetupStep;
        await handleBack(ctx, userId, target);
        break;
      }
      case 'cancel': {
        await cancelFlow(ctx);
        break;
      }
      default:
        break;
    }
  });

  bot.on('message:text', async (ctx, next) => {
    const userId = ctx.from?.id;
    if (!userId) {
      await next();
      return;
    }
    const state = getFlowState(userId);
    if (!state || state.step !== 'location') {
      await next();
      return;
    }
    const text = ctx.message?.text ?? '';
    if (text === '❌ Отмена') {
      await cancelFlow(ctx);
      return;
    }
    await handleTextDuringLocation(ctx, userId, text);
  });

  bot.on('message:location', async (ctx, next) => {
    const userId = ctx.from?.id;
    if (!userId) {
      await next();
      return;
    }
    const state = getFlowState(userId);
    if (!state || state.step !== 'location') {
      await next();
      return;
    }
    await handleSharedLocation(ctx, userId);
  });
}

export async function startAddFlow(ctx: Context, initialData: Partial<SetupData> = {}) {
  await startSetupWizard(ctx, 'add', initialData);
}

