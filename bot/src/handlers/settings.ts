/**
 * Обработчики для настроек (SettingsCallback)
 */

import type { Bot, Context } from 'grammy';
import { prisma } from '../db/prisma';
import { getOrCreateUser } from '../db/user';
import { logger } from '../utils/logger';
import { SettingsCallback } from '../keyboards/callback_data';
import { geocodeCity, DEFAULT_CITY } from '../utils/geocoding';
import { locationQuickPickKeyboard, locationShareKeyboard } from '../keyboards';
import { setFlowState, getFlowState, clearFlowState } from '../state/session';

/**
 * Состояние для добавления города
 */
type AddCityState = {
  flow: 'add_city';
  step: 'location';
  updatedAt: number;
  expiresAt: number;
};

/**
 * Обработка добавления города через геолокацию
 */
async function handleLocationForCity(ctx: Context, userId: number) {
  const loc = ctx.message?.location;
  if (!loc) return false;

  try {
    const telegramId = userId.toString();
    const user = await getOrCreateUser(telegramId, ctx.from?.language_code);

    // Проверяем, есть ли уже такая локация
    const existingLocation = await prisma.location.findFirst({
      where: {
        userId: user.id,
        latitude: loc.latitude,
        longitude: loc.longitude
      }
    });

    if (existingLocation) {
      await ctx.reply(`Город "${existingLocation.name}" уже добавлен.`, {
        reply_markup: { remove_keyboard: true }
      });
      clearFlowState(userId);
      return true;
    }

    // Создаем новую локацию
    const location = await prisma.location.create({
      data: {
        name: 'Моя геолокация',
        latitude: loc.latitude,
        longitude: loc.longitude,
        userId: user.id
      }
    });

    clearFlowState(userId);
    await ctx.reply(
      `✅ Город "${location.name}" успешно добавлен!\n\nТеперь вы можете выбрать его для просмотра погоды.`,
      { reply_markup: { remove_keyboard: true } }
    );

    logger(`User ${userId} added location: ${location.name} (${location.latitude}, ${location.longitude})`);
    return true;
  } catch (error) {
    logger('Error in handleLocationForCity:', error);
    await ctx.reply('Произошла ошибка при добавлении города. Попробуйте еще раз.');
    clearFlowState(userId);
    return true;
  }
}

/**
 * Обработка текстового ввода для добавления города
 */
async function handleTextForCity(ctx: Context, userId: number, text: string) {
  if (text === '❌ Отмена' || text.toLowerCase() === 'отмена') {
    clearFlowState(userId);
    await ctx.reply('Добавление города отменено.', {
      reply_markup: { remove_keyboard: true }
    });
    return true;
  }

  const geocoded = geocodeCity(text);
  if (!geocoded) {
    await ctx.reply(`Город "${text}" не найден. Попробуйте другой город или выберите из списка.`);
    return true;
  }

  try {
    const telegramId = userId.toString();
    const user = await getOrCreateUser(telegramId, ctx.from?.language_code);

    // Проверяем, есть ли уже такой город
    const existingLocation = await prisma.location.findFirst({
      where: {
        userId: user.id,
        name: geocoded.name
      }
    });

    if (existingLocation) {
      await ctx.reply(`Город "${geocoded.name}" уже добавлен.`, {
        reply_markup: { remove_keyboard: true }
      });
      clearFlowState(userId);
      return true;
    }

    // Создаем новую локацию
    const location = await prisma.location.create({
      data: {
        name: geocoded.name,
        latitude: geocoded.latitude,
        longitude: geocoded.longitude,
        userId: user.id
      }
    });

    clearFlowState(userId);
    await ctx.reply(
      `✅ Город "${location.name}" успешно добавлен!\n\nТеперь вы можете выбрать его для просмотра погоды.`,
      { reply_markup: { remove_keyboard: true } }
    );

    logger(`User ${userId} added location: ${location.name}`);
    return true;
  } catch (error) {
    logger('Error in handleTextForCity:', error);
    await ctx.reply('Произошла ошибка при добавлении города. Попробуйте еще раз.');
    clearFlowState(userId);
    return true;
  }
}

/**
 * Начать процесс добавления города
 */
async function startAddCityFlow(ctx: Context) {
  const userId = ctx.from?.id;
  if (!userId) return;

  // Устанавливаем состояние
  setFlowState(userId, {
    flow: 'add_city',
    step: 'location',
    updatedAt: Date.now(),
    expiresAt: Date.now() + 10 * 60 * 1000 // 10 минут
  });

  await ctx.reply(
    'Добавьте город для просмотра погоды.\n\nВыберите город из списка или отправьте название города текстом. Также можно отправить свою геолокацию через обычное сообщение (кнопка 📍 в поле ввода).',
    { reply_markup: locationQuickPickKeyboard() }
  );
  await ctx.reply(
    'Вы можете отправить геолокацию через обычное сообщение (кнопка 📍 в поле ввода) или ввести город текстом.',
    { reply_markup: locationShareKeyboard() }
  );
}


/**
 * Регистрация обработчиков настроек
 */
export function registerSettingsHandlers(bot: Bot<Context>): void {
  // Обработчик для SettingsCallback
  bot.callbackQuery(/^settings:/, async (ctx) => {
    try {
      await ctx.answerCallbackQuery();
    } catch (error: any) {
      if (error.description?.includes('query is too old')) {
        return;
      }
    }

    const data = ctx.callbackQuery.data ?? '';
    const parsed = SettingsCallback.parse(data);
    if (!parsed) {
      await ctx.reply('Ошибка обработки запроса.');
      return;
    }

    const userId = ctx.from?.id;
    if (!userId) return;

    const { section, action, param } = parsed;

    // Обработка добавления города
    if (section === 'cities' && action === 'add') {
      await startAddCityFlow(ctx);
      return;
    }

    // Обработка других действий настроек
    if (section === 'main' && action === 'show') {
      await ctx.reply('⚙️ Настройки\n\nРаздел в разработке.');
      return;
    }

    logger(`Unknown settings action: ${section}:${action}:${param}`);
  });


  // Обработчик текстовых сообщений во время добавления города
  bot.on('message:text', async (ctx, next) => {
    const userId = ctx.from?.id;
    if (!userId) {
      await next();
      return;
    }

    const state = getFlowState(userId);
    if (!state || state.flow !== 'add_city' || state.step !== 'location') {
      await next();
      return;
    }

    const text = ctx.message?.text ?? '';
    const handled = await handleTextForCity(ctx, userId, text);
    if (handled) {
      return;
    }
    await next();
  });

  // Обработчик геолокации во время добавления города
  bot.on('message:location', async (ctx, next) => {
    const userId = ctx.from?.id;
    if (!userId) {
      await next();
      return;
    }

    const state = getFlowState(userId);
    if (!state || state.flow !== 'add_city' || state.step !== 'location') {
      await next();
      return;
    }

    const handled = await handleLocationForCity(ctx, userId);
    if (handled) {
      return;
    }
    await next();
  });
}

