/**
 * Settings Handler
 * 
 * Обработчики для настроек (города, параметры).
 */

import type { Context } from 'telegraf';
import { UserRepository, LocationRepository, UserSettingsRepository } from '../../storage/prisma/repositories';
import { SettingsCallback } from '../keyboards/callback-data';
import {
  getSettingsMainKeyboard,
  getCitiesMenuKeyboard,
  getCityDeleteKeyboard,
  getCitySetMainKeyboard,
  getLocationQuickPickKeyboard,
  getLocationShareKeyboard,
} from '../keyboards/settings.keyboard';
import { geocodeCity, getPopularCities } from '../../shared/utils/geocoding';
import { logger } from '../../shared/utils/logger';

/**
 * Показать главное меню настроек
 */
export async function showSettingsMain(ctx: Context): Promise<void> {
  const telegramId = ctx.from?.id?.toString();
  if (!telegramId) return;

  try {
    const keyboard = getSettingsMainKeyboard();
    const message = '⚙️ Настройки\n\nВыберите раздел:';

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
    logger.error('Error in showSettingsMain:', error);
    await ctx.reply('❌ Произошла ошибка при открытии настроек.');
  }
}

/**
 * Показать меню городов
 */
export async function showCitiesMenu(ctx: Context): Promise<void> {
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
    
    // Получаем настройки
    const settings = await settingsRepo.findByUserId(user.id);
    const defaultLocationId = settings?.defaultLocationId ?? null;

    const keyboard = getCitiesMenuKeyboard();
    
    let text = '📍 Ваши сохраненные города:';
    if (locations.length === 0) {
      text += '\n\nУ вас пока нет сохраненных городов.';
    } else {
      const lines: string[] = [];
      locations.forEach((loc, idx) => {
        const isDefault = defaultLocationId === loc.id;
        lines.push(`${idx + 1}. ${loc.name}${isDefault ? ' (основной)' : ''}`);
      });
      text += `\n\n${lines.join('\n')}`;
    }

    if (ctx.callbackQuery) {
      try {
        await ctx.editMessageText(text, keyboard);
        await ctx.answerCbQuery();
      } catch (error: any) {
        if (error.description?.includes('message is not modified')) {
          await ctx.answerCbQuery();
          return;
        }
        await ctx.reply(text, keyboard);
      }
    } else {
      await ctx.reply(text, keyboard);
    }
  } catch (error) {
    logger.error('Error in showCitiesMenu:', error);
    await ctx.reply('❌ Произошла ошибка при получении списка городов.');
  }
}

/**
 * Показать меню добавления города
 */
export async function showAddCityMenu(ctx: Context): Promise<void> {
  try {
    const quickPickKeyboard = getLocationQuickPickKeyboard();
    const shareKeyboard = getLocationShareKeyboard();
    
    await ctx.reply(
      '📍 Добавление города\n\nВыберите город из списка или отправьте свою геолокацию:',
      quickPickKeyboard
    );
    
    await ctx.reply(
      'Или отправьте геолокацию через кнопку ниже:',
      shareKeyboard
    );
  } catch (error) {
    logger.error('Error in showAddCityMenu:', error);
    await ctx.reply('❌ Произошла ошибка при открытии меню добавления города.');
  }
}

/**
 * Добавить город по названию
 */
export async function addCityByName(ctx: Context, cityName: string): Promise<void> {
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

    // Геокодинг города
    const geocoded = geocodeCity(cityName);
    if (!geocoded) {
      await ctx.reply(`❌ Город "${cityName}" не найден. Попробуйте другой город.`);
      return;
    }

    // Проверяем, есть ли уже такой город
    const existing = await locationRepo.findByUserId(user.id);
    const alreadyExists = existing.some(loc => loc.name.toLowerCase() === geocoded.name.toLowerCase());
    
    if (alreadyExists) {
      await ctx.reply(`ℹ️ Город "${geocoded.name}" уже добавлен.`, { reply_markup: { remove_keyboard: true } });
      return;
    }

    // Создаем новую локацию
    const location = await locationRepo.create({
      name: geocoded.name,
      latitude: geocoded.latitude,
      longitude: geocoded.longitude,
      countryCode: geocoded.countryCode || null,
      user: { connect: { id: user.id } },
    });

    await ctx.reply(
      `✅ Город "${location.name}" успешно добавлен!\n\nТеперь вы можете выбрать его для просмотра погоды.`,
      { reply_markup: { remove_keyboard: true } }
    );

    logger.info(`User ${telegramId} added location: ${location.name}`);
  } catch (error) {
    logger.error('Error in addCityByName:', error);
    await ctx.reply('❌ Произошла ошибка при добавлении города. Попробуйте еще раз.');
  }
}

/**
 * Добавить город по геолокации
 */
export async function addCityByLocation(ctx: Context, latitude: number, longitude: number): Promise<void> {
  const telegramId = ctx.from?.id?.toString();
  if (!telegramId) return;

  try {
    // TODO: Обратный геокодинг для получения названия города по координатам
    // Пока используем дефолтное название
    await ctx.reply(
      '📍 Геолокация получена.\n\nОбратный геокодинг пока не реализован. Используйте добавление по названию города.',
      { reply_markup: { remove_keyboard: true } }
    );
  } catch (error) {
    logger.error('Error in addCityByLocation:', error);
    await ctx.reply('❌ Произошла ошибка при обработке геолокации.');
  }
}

/**
 * Удалить город
 */
export async function deleteCity(ctx: Context, locationId: number): Promise<void> {
  const telegramId = ctx.from?.id?.toString();
  if (!telegramId) return;

  try {
    const userRepo = new UserRepository();
    const locationRepo = new LocationRepository();
    const settingsRepo = new UserSettingsRepository();
    
    const user = await userRepo.findByTelegramId(telegramId);
    if (!user) {
      await ctx.reply('❌ Пользователь не найден.');
      return;
    }

    // Проверяем, что локация принадлежит пользователю
    const location = await locationRepo.findById(locationId);
    if (!location || location.userId !== user.id) {
      await ctx.reply('❌ Локация не найдена или не принадлежит вам.');
      return;
    }

    // Удаляем локацию
    await locationRepo.delete(locationId);

    // Если это была дефолтная локация, сбрасываем её
    const settings = await settingsRepo.findByUserId(user.id);
    if (settings?.defaultLocationId === locationId) {
      await settingsRepo.setDefaultLocation(user.id, null);
    }

    await ctx.reply(`✅ Город "${location.name}" удален.`);
    await showCitiesMenu(ctx);
  } catch (error) {
    logger.error('Error in deleteCity:', error);
    await ctx.reply('❌ Произошла ошибка при удалении города.');
  }
}

/**
 * Установить город как основной
 */
export async function setMainCity(ctx: Context, locationId: number): Promise<void> {
  const telegramId = ctx.from?.id?.toString();
  if (!telegramId) return;

  try {
    const userRepo = new UserRepository();
    const locationRepo = new LocationRepository();
    const settingsRepo = new UserSettingsRepository();
    
    const user = await userRepo.findByTelegramId(telegramId);
    if (!user) {
      await ctx.reply('❌ Пользователь не найден.');
      return;
    }

    // Проверяем, что локация принадлежит пользователю
    const location = await locationRepo.findById(locationId);
    if (!location || location.userId !== user.id) {
      await ctx.reply('❌ Локация не найдена или не принадлежит вам.');
      return;
    }

    // Устанавливаем как дефолтную
    await settingsRepo.setDefaultLocation(user.id, locationId);

    await ctx.reply(`✅ Город "${location.name}" установлен как основной.`);
    await showCitiesMenu(ctx);
  } catch (error) {
    logger.error('Error in setMainCity:', error);
    await ctx.reply('❌ Произошла ошибка при установке основного города.');
  }
}

/**
 * Регистрация обработчиков настроек
 */
export function registerSettingsHandlers(bot: any): void {
  // Обработчики для настроек
  bot.action(/^settings:/, async (ctx: Context) => {
    try {
          await ctx.answerCbQuery();
    } catch (error: any) {
      if (error.description?.includes('query is too old')) {
        return;
      }
    }

    const data = ctx.callbackQuery && 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : '';
    const parsed = SettingsCallback.parse(data);
    
    if (!parsed) {
      await ctx.reply('Ошибка обработки запроса.');
      return;
    }

    const { section, action, param } = parsed;

    switch (section) {
      case 'main':
        // Если action === 'show' или action === 'main' или action не указан - показываем главное меню настроек
        if (!action || action === 'show' || action === 'main') {
          await showSettingsMain(ctx);
        }
        break;
      case 'cities':
        if (action === 'show') {
          await showCitiesMenu(ctx);
        } else if (action === 'add') {
          await showAddCityMenu(ctx);
        } else if (action === 'delete_menu') {
          // Показываем список городов для удаления
          const telegramId = ctx.from?.id?.toString();
          if (telegramId) {
            const userRepo = new UserRepository();
            const locationRepo = new LocationRepository();
            const user = await userRepo.findByTelegramId(telegramId);
            if (user) {
              const locations = await locationRepo.findByUserId(user.id);
              const keyboard = getCityDeleteKeyboard(locations.map(loc => ({ id: loc.id, name: loc.name })));
              await ctx.editMessageText('🗑 Выберите город для удаления:', keyboard);
            }
          }
        } else if (action === 'delete' && param) {
          await deleteCity(ctx, Number(param));
        } else if (action === 'set_main_menu') {
          // Показываем список городов для установки основного
          const telegramId = ctx.from?.id?.toString();
          if (telegramId) {
            const userRepo = new UserRepository();
            const locationRepo = new LocationRepository();
            const user = await userRepo.findByTelegramId(telegramId);
            if (user) {
              const locations = await locationRepo.findByUserId(user.id);
              const keyboard = getCitySetMainKeyboard(locations.map(loc => ({ id: loc.id, name: loc.name })));
              await ctx.editMessageText('📌 Выберите город как основной:', keyboard);
            }
          }
        } else if (action === 'set_main' && param) {
          await setMainCity(ctx, Number(param));
        }
        break;
    }
  });

  // Обработка текстовых сообщений для добавления города (только если это не команда)
  bot.hears(/^(?!\/)/, async (ctx: Context) => {
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    
    // Проверяем, является ли это названием города из популярных
    if (text && getPopularCities().some(city => city.name.toLowerCase() === text.toLowerCase())) {
      await addCityByName(ctx, text);
      return;
    }
    
    // Также проверяем через geocodeCity для других городов
    if (text) {
      const geocoded = geocodeCity(text);
      if (geocoded) {
        await addCityByName(ctx, text);
      }
    }
  });

  // Обработка геолокации
  bot.on('location', async (ctx: Context) => {
    const location = ctx.message && 'location' in ctx.message ? ctx.message.location : null;
    if (location) {
      await addCityByLocation(ctx, location.latitude, location.longitude);
    }
  });
}

