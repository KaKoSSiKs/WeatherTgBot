/**
 * Обработчики для настроек (SettingsCallback)
 */

import type { Bot, Context } from 'grammy';
import { prisma } from '../db/prisma';

// Interface for user settings
type UserSettings = {
  id: number;
  userId: number;
  defaultCityId: number | null;
  temperatureUnit: string;
  windUnit: string;
  pressureUnit: string;
  displaySettings: string | null;
  notificationPrefix: string;
  silentModeEnabled: boolean;
  silentModeStart: string;
  silentModeEnd: string;
  createdAt: Date;
  updatedAt: Date;
} | null;

// Interface for location
type UserLocation = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  userId: number;
}[];
import { getOrCreateUser } from '../db/user';
import { logger } from '../utils/logger';
import { SettingsCallback } from '../keyboards/callback_data';
import { geocodeCity, DEFAULT_CITY } from '../utils/geocoding';
import { locationQuickPickKeyboard, locationShareKeyboard } from '../keyboards';
import { setFlowState, getFlowState, clearFlowState } from '../state/session';
import { InlineKeyboard } from 'grammy';
// import { I18nContext } from '../i18n'; // Temporarily commented out until we set up i18n

async function getUserSettingsSafe(userDbId: number): Promise<UserSettings> {
  const prismaAny = prisma as any;
  const userSettingsDelegate = prismaAny.userSettings;
  if (!userSettingsDelegate?.findUnique) {
    return null;
  }

  try {
    return (await userSettingsDelegate.findUnique({
      where: { userId: userDbId }
    })) as UserSettings;
  } catch (error) {
    console.warn('Failed to load user settings (fallback to defaults):', error);
    return null;
  }
}

async function ensureUserSettingsSafe(userDbId: number): Promise<UserSettings> {
  const prismaAny = prisma as any;
  const userSettingsDelegate = prismaAny.userSettings;
  if (!userSettingsDelegate?.findUnique || !userSettingsDelegate?.create) {
    return null;
  }

  const existing = await getUserSettingsSafe(userDbId);
  if (existing) return existing;

  try {
    const created = (await userSettingsDelegate.create({
      data: {
        user: { connect: { id: userDbId } }
      }
    })) as UserSettings;

    // связываем settingsId в User, если поле есть
    try {
      const userDelegate = prismaAny.user;
      await userDelegate.update({
        where: { id: userDbId },
        data: { settingsId: (created as any).id }
      });
    } catch {
      // ignore
    }

    return created;
  } catch (error) {
    console.warn('Failed to create user settings:', error);
    return null;
  }
}

async function updateUserSettingsSafe(userDbId: number, data: Record<string, unknown>): Promise<boolean> {
  const prismaAny = prisma as any;
  const userSettingsDelegate = prismaAny.userSettings;
  if (!userSettingsDelegate?.update) {
    return false;
  }
  try {
    await ensureUserSettingsSafe(userDbId);
    await userSettingsDelegate.update({
      where: { userId: userDbId },
      data
    });
    return true;
  } catch (error) {
    console.warn('Failed to update user settings:', error);
    return false;
  }
}

async function editOrReply(ctx: Context, text: string, keyboard: InlineKeyboard, parseMode?: 'Markdown') {
  if (ctx.callbackQuery) {
    try {
      await ctx.editMessageText(text, {
        reply_markup: keyboard,
        ...(parseMode ? { parse_mode: parseMode } : {})
      });
      return;
    } catch {
      // ignore
    }
  }
  await ctx.reply(text, {
    reply_markup: keyboard,
    ...(parseMode ? { parse_mode: parseMode } : {})
  });
}

const DISPLAY_KEYS = new Set([
  'temperature',
  'feelsLike',
  'humidity',
  'pressure',
  'visibility',
  'wind',
  'precipitation',
  'sunriseSunset',
  'recommendations',
  'warnings',
  'timePeriods',
  'hourlyDetails'
]);

const silentHoursPending = new Map<number, number>();

/**
 * Показать главное меню настроек
 */
export async function showSettingsMainMenu(ctx: Context) {
  // const i18n = I18nContext.current(); // Temporarily using hardcoded Russian text
  
  const keyboard = new InlineKeyboard()
    .text('📍 Мои города', 'settings:cities:list')
    .text('🔧 Параметры', 'settings:display:show')
    .row()
    .text('🔔 Уведомления', 'settings:notifications')
    .row()
    .text('⬅️ Назад', 'nav:back')
    .text('🏠 Главное меню', 'nav:main_menu');

  await editOrReply(ctx, '⚙️ Настройки', keyboard);
}

/**
 * Обработка главного меню настроек
 */
async function handleSettingsMainMenu(ctx: Context) {
  if (ctx.callbackQuery) {
    await ctx.answerCallbackQuery();
    
    // Удаляем предыдущее сообщение с меню
    try {
      await ctx.deleteMessage();
    } catch (e) {
      console.warn('Failed to delete message:', e);
    }
  }
  
  await showSettingsMainMenu(ctx);
}

/**
 * Показать меню городов
 */
async function showCitiesMenu(ctx: Context) {
  const userId = ctx.from?.id;
  if (!userId) return;

  try {
    // Get user with locations
    const user = await prisma.user.findUnique({
      where: { telegramId: userId.toString() }
    });

    if (!user) {
      await ctx.reply('Пользователь не найден.');
      return;
    }

    // Get user locations
    const locations = await prisma.location.findMany({
      where: { userId: user.id }
    });

    // Get user settings
    const settings = await getUserSettingsSafe(user.id);

    const defaultCityId = settings?.defaultCityId ?? null;

    const keyboard = new InlineKeyboard();

    let text = '📍 Ваши сохраненные города:';
    if (!locations || locations.length === 0) {
      text += '\n\nУ вас пока нет сохраненных городов.';
    } else {
      const lines: string[] = [];
      locations.forEach((loc, idx) => {
        const isDefault = defaultCityId === loc.id;
        lines.push(`${idx + 1}. ${loc.name}${isDefault ? ' (основной)' : ''}`);
      });
      text += `\n\n${lines.join('\n')}`;
    }

    keyboard
      .text('➕ Добавить город', 'settings:cities:add')
      .text('🗑 Удалить город', 'settings:cities:delete_menu')
      .row()
      .text('📌 Сделать основным', 'settings:cities:set_main_menu')
      .row()
      .text('⬅️ Назад', 'settings:main:show')
      .text('🏠 Главное меню', 'nav:main_menu');

    await editOrReply(ctx, text, keyboard);
  } catch (error) {
    console.error('Error in showCitiesMenu:', error);
    await ctx.reply('Произошла ошибка при загрузке списка городов.');
  }
}

async function showCitiesDeleteMenu(ctx: Context) {
  const userId = ctx.from?.id;
  if (!userId) return;

  try {
    const user = await prisma.user.findUnique({
      where: { telegramId: userId.toString() }
    });
    if (!user) {
      await ctx.reply('Пользователь не найден.');
      return;
    }

    const locations = await prisma.location.findMany({
      where: { userId: user.id }
    });

    const keyboard = new InlineKeyboard();
    if (!locations || locations.length === 0) {
      keyboard
        .text('⬅️ Назад', 'settings:cities:list')
        .text('🏠 Главное меню', 'nav:main_menu');
      await editOrReply(ctx, '🗑 Удаление города\n\nУ вас нет сохраненных городов.', keyboard);
      return;
    }

    for (const loc of locations) {
      keyboard.text(`🗑 ${loc.name}`, `settings:cities:delete:${loc.id}`).row();
    }
    keyboard
      .text('⬅️ Назад', 'settings:cities:list')
      .text('🏠 Главное меню', 'nav:main_menu');

    await editOrReply(ctx, '🗑 Удаление города\n\nВыберите город для удаления:', keyboard);
  } catch (error) {
    console.error('Error in showCitiesDeleteMenu:', error);
    await ctx.reply('Произошла ошибка при загрузке списка городов.');
  }
}

async function showCitiesSetMainMenu(ctx: Context) {
  const userId = ctx.from?.id;
  if (!userId) return;

  try {
    const user = await prisma.user.findUnique({
      where: { telegramId: userId.toString() }
    });
    if (!user) {
      await ctx.reply('Пользователь не найден.');
      return;
    }

    const locations = await prisma.location.findMany({
      where: { userId: user.id }
    });

    const settings = await getUserSettingsSafe(user.id);
    const defaultCityId = settings?.defaultCityId ?? null;

    const keyboard = new InlineKeyboard();
    if (!locations || locations.length === 0) {
      keyboard
        .text('⬅️ Назад', 'settings:cities:list')
        .text('🏠 Главное меню', 'nav:main_menu');
      await editOrReply(ctx, '📌 Установка основного города\n\nУ вас нет сохраненных городов.', keyboard);
      return;
    }

    for (const loc of locations) {
      const prefix = defaultCityId === loc.id ? '⭐ ' : '';
      keyboard.text(`${prefix}${loc.name}`, `settings:cities:set_main:${loc.id}`).row();
    }
    keyboard
      .text('⬅️ Назад', 'settings:cities:list')
      .text('🏠 Главное меню', 'nav:main_menu');

    await editOrReply(ctx, '📌 Установка основного города\n\nВыберите основной город:', keyboard);
  } catch (error) {
    console.error('Error in showCitiesSetMainMenu:', error);
    await ctx.reply('Произошла ошибка при загрузке списка городов.');
  }
}

/**
 * Показать настройки отображения
 */
async function showDisplaySettings(ctx: Context) {
  const userId = ctx.from?.id;
  if (!userId) return;

  try {
    // Get user
    const user = await prisma.user.findUnique({
      where: { telegramId: userId.toString() }
    });

    if (!user) {
      await ctx.reply('Пользователь не найден.');
      return;
    }

    // Get user settings from the database
    const userSettings = await getUserSettingsSafe(user.id);

    // Default display settings
    const defaultDisplaySettings = {
      temperature: true,
      feelsLike: true,
      humidity: true,
      pressure: true,
      visibility: true,
      wind: true,
      precipitation: true,
      sunriseSunset: true,
      recommendations: true,
      warnings: true,
      timePeriods: true,
      hourlyDetails: false
    };

    // Parse display settings or use defaults
    let displaySettings = { ...defaultDisplaySettings };
    
    if (userSettings?.displaySettings) {
      try {
        displaySettings = {
          ...displaySettings,
          ...JSON.parse(userSettings.displaySettings)
        };
      } catch (e) {
        console.error('Error parsing display settings:', e);
      }
    }

    const keyboard = new InlineKeyboard();
    
    // Добавляем переключатели для каждой настройки
    keyboard
      .text(`${displaySettings.temperature ? '✅' : '❌'} Температура`, 'toggle:temperature')
      .text(`${displaySettings.humidity ? '✅' : '❌'} Влажность`, 'toggle:humidity')
      .row()
      .text(`${displaySettings.pressure ? '✅' : '❌'} Давление`, 'toggle:pressure')
      .text(`${displaySettings.wind ? '✅' : '❌'} Ветер`, 'toggle:wind')
      .row()
      .text(`${displaySettings.precipitation ? '✅' : '❌'} Осадки`, 'toggle:precipitation')
      .text(`${displaySettings.visibility ? '✅' : '❌'} Видимость`, 'toggle:visibility')
      .row()
      .text(`${displaySettings.sunriseSunset ? '✅' : '❌'} Восход/закат`, 'toggle:sunriseSunset')
      .text(`${displaySettings.recommendations ? '✅' : '❌'} Рекомендации`, 'toggle:recommendations')
      .row()
      .text(`${displaySettings.warnings ? '✅' : '❌'} Предупреждения`, 'toggle:warnings')
      .text(`${displaySettings.timePeriods ? '✅' : '❌'} Временные периоды`, 'toggle:timePeriods')
      .row()
      .text(`${displaySettings.hourlyDetails ? '✅' : '❌'} Почасовой прогноз`, 'toggle:hourlyDetails')
      .row()
      .text('⬅️ Назад', 'settings:main:show')
      .text('🏠 Главное меню', 'nav:main_menu');

    await editOrReply(ctx, '🔧 Параметры отображения:', keyboard);
  } catch (error) {
    console.error('Error in showDisplaySettings:', error);
    await ctx.reply('Произошла ошибка при загрузке настроек отображения.');
  }
}

/**
 * Показать настройки уведомлений
 */
async function showNotificationsMenu(ctx: Context) {
  const userId = ctx.from?.id;
  if (!userId) return;

  try {
    // Get user
    const user = await prisma.user.findUnique({
      where: { telegramId: userId.toString() }
    });

    if (!user) {
      await ctx.reply('Пользователь не найден.');
      return;
    }

    // Get user settings from the database
    const userSettings = await getUserSettingsSafe(user.id);

    const silentModeEnabled = userSettings?.silentModeEnabled ?? false;
    const silentModeStart = userSettings?.silentModeStart ?? '23:00';
    const silentModeEnd = userSettings?.silentModeEnd ?? '07:00';

    const keyboard = new InlineKeyboard();
    
    // Добавляем кнопки для настройки часов тишины
    keyboard
      .text(
        `${silentModeEnabled ? '🔕' : '🔔'} ${silentModeEnabled ? 'Отключить' : 'Включить'} часы тишины`, 
        `toggle:silentMode`
      )
      .row();

    // Добавляем предустановленные периоды, если часы тишины включены
    if (silentModeEnabled) {
      keyboard
        .text(`🕐 23:00 - 07:00`, 'set_silent_hours:23-7')
        .text(`🕛 00:00 - 08:00`, 'set_silent_hours:0-8')
        .row()
        .text(`🕙 22:00 - 06:00`, 'set_silent_hours:22-6')
        .text('✏️ Свое время', 'set_silent_hours:custom')
        .row();
    }

    keyboard
      .text('⬅️ Назад', 'settings:main:show')
      .text('🏠 Главное меню', 'nav:main_menu');

    const statusText = silentModeEnabled 
      ? `Часы тишины активны с ${silentModeStart} до ${silentModeEnd}`
      : 'Часы тишины отключены';

    await editOrReply(ctx, `🔔 Настройки уведомлений\n\n${statusText}`, keyboard, 'Markdown');
  } catch (error) {
    console.error('Error in showNotificationsMenu:', error);
    await ctx.reply('Произошла ошибка при загрузке настроек уведомлений.');
  }
}

/**
 * Состояние для добавления города
 */
type AddCityState = {
  flow: 'add_city';
  step: 'location';
  data: Record<string, unknown>;
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

    const settings = await ensureUserSettingsSafe(user.id);
    if (settings && (settings.defaultCityId === null || settings.defaultCityId === undefined)) {
      await updateUserSettingsSafe(user.id, { defaultCityId: location.id });
    }

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

    const settings = await ensureUserSettingsSafe(user.id);
    if (settings && (settings.defaultCityId === null || settings.defaultCityId === undefined)) {
      await updateUserSettingsSafe(user.id, { defaultCityId: location.id });
    }

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
    data: {},
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
  bot.callbackQuery(/^toggle:/, async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const key = (ctx.callbackQuery?.data ?? '').split(':')[1];
    try {
      await ctx.answerCallbackQuery();
    } catch {
      // ignore
    }

    const user = await prisma.user.findUnique({
      where: { telegramId: userId.toString() }
    });
    if (!user) {
      await ctx.reply('Пользователь не найден.');
      return;
    }

    if (key === 'silentMode') {
      const current = await ensureUserSettingsSafe(user.id);
      const nextEnabled = !(current?.silentModeEnabled ?? false);
      await updateUserSettingsSafe(user.id, { silentModeEnabled: nextEnabled });
      await showNotificationsMenu(ctx);
      return;
    }

    if (!DISPLAY_KEYS.has(key)) {
      await ctx.answerCallbackQuery({ text: 'Неизвестный параметр' }).catch(() => undefined);
      return;
    }

    const settings = await ensureUserSettingsSafe(user.id);
    const defaults: Record<string, boolean> = {
      temperature: true,
      feelsLike: true,
      humidity: true,
      pressure: true,
      visibility: true,
      wind: true,
      precipitation: true,
      sunriseSunset: true,
      recommendations: true,
      warnings: true,
      timePeriods: true,
      hourlyDetails: false
    };
    let currentDisplay: Record<string, boolean> = { ...defaults };
    if (settings?.displaySettings) {
      try {
        currentDisplay = { ...currentDisplay, ...(JSON.parse(settings.displaySettings) as any) };
      } catch {
        // ignore
      }
    }
    currentDisplay[key] = !currentDisplay[key];
    await updateUserSettingsSafe(user.id, { displaySettings: JSON.stringify(currentDisplay) });
    await showDisplaySettings(ctx);
  });

  bot.callbackQuery(/^set_silent_hours:/, async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const arg = (ctx.callbackQuery?.data ?? '').split(':')[1];
    try {
      await ctx.answerCallbackQuery();
    } catch {
      // ignore
    }

    const user = await prisma.user.findUnique({
      where: { telegramId: userId.toString() }
    });
    if (!user) {
      await ctx.reply('Пользователь не найден.');
      return;
    }

    if (arg === 'custom') {
      silentHoursPending.set(userId, Date.now() + 5 * 60 * 1000);
      await ctx.reply('Введите период тишины в формате HH:MM-HH:MM, например 23:00-07:00');
      return;
    }

    const presetMap: Record<string, { start: string; end: string }> = {
      '23-7': { start: '23:00', end: '07:00' },
      '0-8': { start: '00:00', end: '08:00' },
      '22-6': { start: '22:00', end: '06:00' }
    };

    const preset = presetMap[arg];
    if (!preset) {
      await ctx.answerCallbackQuery({ text: 'Неизвестный период' }).catch(() => undefined);
      return;
    }

    await updateUserSettingsSafe(user.id, {
      silentModeEnabled: true,
      silentModeStart: preset.start,
      silentModeEnd: preset.end
    });
    await showNotificationsMenu(ctx);
  });

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

    // Legacy callbacks from old keyboards: settings:city:<locationId>
    if (section === 'city' && action && /^\d+$/.test(action)) {
      const locationId = Number(action);
      const user = await prisma.user.findUnique({
        where: { telegramId: userId.toString() }
      });
      if (!user) {
        await ctx.reply('Пользователь не найден.');
        return;
      }

      await updateUserSettingsSafe(user.id, { defaultCityId: locationId });
      await showCitiesMenu(ctx);
      return;
    }

    // Обработка добавления города
    if (section === 'cities' && action === 'add') {
      await startAddCityFlow(ctx);
      return;
    }

    // Обработка главного меню настроек
    if (section === 'main' && action === 'show') {
      await showSettingsMainMenu(ctx);
      return;
    }
    
    // Обработка подменю городов
    if (section === 'cities') {
      if (action === 'list') {
        await showCitiesMenu(ctx);
        return;
      } else if (action === 'add') {
        await startAddCityFlow(ctx);
        return;
      } else if (action === 'delete_menu') {
        await showCitiesDeleteMenu(ctx);
        return;
      } else if (action === 'set_main_menu') {
        await showCitiesSetMainMenu(ctx);
        return;
      } else if (action === 'delete' && param) {
        const locationId = Number(param);
        const user = await prisma.user.findUnique({
          where: { telegramId: userId.toString() }
        });
        if (!user) {
          await ctx.reply('Пользователь не найден.');
          return;
        }
        await prisma.location.deleteMany({
          where: { id: locationId, userId: user.id }
        });
        const settings = await getUserSettingsSafe(user.id);
        if (settings?.defaultCityId === locationId) {
          await updateUserSettingsSafe(user.id, { defaultCityId: null });
        }
        await showCitiesMenu(ctx);
        return;
      } else if (action === 'set_main' && param) {
        const locationId = Number(param);
        const user = await prisma.user.findUnique({
          where: { telegramId: userId.toString() }
        });
        if (!user) {
          await ctx.reply('Пользователь не найден.');
          return;
        }
        await updateUserSettingsSafe(user.id, { defaultCityId: locationId });
        await showCitiesMenu(ctx);
        return;
      }
    }
    
    // Обработка настроек отображения
    if (section === 'display') {
      await showDisplaySettings(ctx);
      return;
    }
    
    // Обработка настроек уведомлений
    if (section === 'notifications') {
      await showNotificationsMenu(ctx);
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

    const pendingUntil = silentHoursPending.get(userId);
    if (pendingUntil && Date.now() <= pendingUntil) {
      const text = (ctx.message?.text ?? '').trim();
      const match = text.match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/);
      if (!match) {
        await ctx.reply('Неверный формат. Введите так: 23:00-07:00');
        return;
      }
      const h1 = Number(match[1]);
      const m1 = Number(match[2]);
      const h2 = Number(match[3]);
      const m2 = Number(match[4]);
      const valid = (h: number, m: number) => h >= 0 && h <= 23 && m >= 0 && m <= 59;
      if (!valid(h1, m1) || !valid(h2, m2)) {
        await ctx.reply('Время должно быть в диапазоне 00:00-23:59.');
        return;
      }

      const user = await prisma.user.findUnique({
        where: { telegramId: userId.toString() }
      });
      if (!user) {
        await ctx.reply('Пользователь не найден.');
        silentHoursPending.delete(userId);
        return;
      }

      const start = `${String(h1).padStart(2, '0')}:${String(m1).padStart(2, '0')}`;
      const end = `${String(h2).padStart(2, '0')}:${String(m2).padStart(2, '0')}`;
      await updateUserSettingsSafe(user.id, {
        silentModeEnabled: true,
        silentModeStart: start,
        silentModeEnd: end
      });

      silentHoursPending.delete(userId);
      await ctx.reply(`✅ Часы тишины установлены: ${start} - ${end}`);
      await showNotificationsMenu(ctx);
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

