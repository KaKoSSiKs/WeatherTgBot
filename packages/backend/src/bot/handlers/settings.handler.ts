/**
 * Settings Handler
 * 
 * Обработчик callback'ов для настроек.
 */

import type { Context } from 'telegraf';
import { Markup } from 'telegraf';
import { SettingsCallback, WeatherCallback } from '../keyboards/callback_data';
import { getCitySelectionKeyboard, getNoCitiesKeyboard } from '../keyboards/currentWeather';
import { locationQuickPickKeyboard, locationShareKeyboard } from '../keyboards/locationQuickPick';
import { mainMenuKeyboard, MAIN_MENU_TEXT } from '../keyboards';
import { UserRepository } from '../../storage/prisma/repositories';
import { LocationRepository } from '../../storage/prisma/repositories/location.repository';
import { UserSettingsRepository } from '../../storage/prisma/repositories/user-settings.repository';
import { pushNavigationState, popNavigationState } from '../../shared/utils/navigation';
import { handleError } from './error.handler';
import { logger } from '../../shared/utils/logger';
import { geocodeCity } from '../../integrations/geocoding/geocoding.service';

/**
 * Обработчик callback'ов настроек
 */
export async function handleSettingsCallback(ctx: Context): Promise<void> {
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
  const parsed = SettingsCallback.parse(data);
  
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

  try {
    switch (parsed.section) {
      case 'main': {
        if (parsed.action === 'show') {
          const settingsRepo = new UserSettingsRepository();
          const settings = await settingsRepo.findByUserId(user.id);
          const locationRepo = new LocationRepository();
          const locations = await locationRepo.findByUserId(user.id);
          
          const text = `⚙️ Настройки\n\n` +
            `📍 Локации: ${locations.length}\n` +
            `🌡️ Единицы: ${settings?.temperatureUnit === 'FAHRENHEIT' ? 'Фаренгейт' : 'Цельсий'}\n` +
            `🌐 Язык: ${user.languageCode || 'ru'}\n\n` +
            `Выберите раздел:`;
          
          const keyboard = Markup.inlineKeyboard([
            [
              Markup.button.callback('📍 Мои города', SettingsCallback.create('cities', 'list'))
            ],
            [
              Markup.button.callback('🌡️ Единицы измерения', SettingsCallback.create('units', 'show'))
            ],
            [
              Markup.button.callback('🏠 Главное меню', 'nav:main_menu')
            ]
          ]);
          
          await ctx.editMessageText(text, keyboard);
        }
        break;
      }
      
      case 'cities': {
        if (parsed.action === 'list') {
          const locationRepo = new LocationRepository();
          const locations = await locationRepo.findByUserId(user.id);
          
          if (locations.length === 0) {
            const text = `📍 Мои города\n\nУ вас пока нет сохраненных городов.\n\nДобавьте город, чтобы получать прогнозы погоды.`;
            await ctx.editMessageText(text, getNoCitiesKeyboard('settings'));
          } else {
            const text = `📍 Мои города (${locations.length}):\n\nВыберите город для просмотра или управления:`;
            await ctx.editMessageText(text, getCitySelectionKeyboard(locations, 'settings'));
          }
        } else if (parsed.action === 'add') {
          const text = '📍 Добавление города\n\nОтправьте название города или поделитесь геолокацией (📍 кнопка внизу).\n\nПопулярные города:';
          const keyboard = Markup.inlineKeyboard([
            [
              Markup.button.callback('📍 Москва', SettingsCallback.create('cities', 'quick_add', 'Москва')),
              Markup.button.callback('📍 Санкт-Петербург', SettingsCallback.create('cities', 'quick_add', 'Санкт-Петербург'))
            ],
            [
              Markup.button.callback('📍 Лондон', SettingsCallback.create('cities', 'quick_add', 'Лондон')),
              Markup.button.callback('📍 Нью-Йорк', SettingsCallback.create('cities', 'quick_add', 'Нью-Йорк'))
            ],
            [
              Markup.button.callback('⬅️ Назад', SettingsCallback.create('cities', 'list'))
            ]
          ]);
          
          // Клавиатура для запроса геолокации (отдельное сообщение)
          const locationKeyboard = Markup.keyboard([
            [Markup.button.locationRequest('📍 Отправить геолокацию')]
          ]).oneTime().resize();
          
          try {
            if (ctx.callbackQuery && 'message' in ctx.callbackQuery && ctx.callbackQuery.message) {
              await ctx.editMessageText(text, keyboard);
              // Отправляем отдельное сообщение с кнопкой геолокации
              await ctx.reply('Или отправьте геолокацию:', locationKeyboard);
            } else {
              await ctx.reply(text, keyboard);
              await ctx.reply('Или отправьте геолокацию:', locationKeyboard);
            }
          } catch (err) {
            // Если не удалось отредактировать, отправляем новое сообщение
            await ctx.reply(text, keyboard);
            await ctx.reply('Или отправьте геолокацию:', locationKeyboard);
          }
        } else if (parsed.action === 'select') {
          // Показываем детали города и действия
          if (parsed.param) {
            const locationId = parseInt(String(parsed.param));
            const locationRepo = new LocationRepository();
            const location = await locationRepo.findById(locationId);
            
            if (location && location.userId === user.id) {
              const settingsRepo = new UserSettingsRepository();
              const settings = await settingsRepo.findByUserId(user.id);
              const isDefault = settings?.defaultLocationId === locationId;
              
              const text = `📍 ${location.name}\n\n` +
                `Координаты: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}\n` +
                `${isDefault ? '✅ Установлен по умолчанию' : 'Не установлен по умолчанию'}\n\n` +
                `Выберите действие:`;
              
              const keyboard = Markup.inlineKeyboard([
                [
                  Markup.button.callback('🌤️ Показать погоду', WeatherCallback.create('select_city', locationId, 'weather'))
                ],
                [
                  Markup.button.callback(
                    isDefault ? '✅ По умолчанию' : '⭐ Установить по умолчанию',
                    SettingsCallback.create('cities', 'set_default', locationId)
                  )
                ],
                [
                  Markup.button.callback('🗑️ Удалить', SettingsCallback.create('cities', 'delete', locationId))
                ],
                [
                  Markup.button.callback('⬅️ К списку', SettingsCallback.create('cities', 'list'))
                ]
              ]);
              
              await ctx.editMessageText(text, keyboard);
            }
          }
        } else if (parsed.action === 'delete') {
          if (parsed.param) {
            const locationId = parseInt(String(parsed.param));
            const locationRepo = new LocationRepository();
            const location = await locationRepo.findById(locationId);
            
            if (location && location.userId === user.id) {
              await locationRepo.delete(locationId);
              await ctx.answerCbQuery('Город удален');
              
              // Обновляем список
              const locations = await locationRepo.findByUserId(user.id);
              if (locations.length === 0) {
                const text = `📍 Мои города\n\nУ вас пока нет сохраненных городов.`;
                await ctx.editMessageText(text, getNoCitiesKeyboard('settings'));
              } else {
                const text = `📍 Мои города (${locations.length}):\n\nВыберите город для просмотра или управления:`;
                await ctx.editMessageText(text, getCitySelectionKeyboard(locations, 'settings'));
              }
            }
          }
        } else if (parsed.action === 'set_default') {
          if (parsed.param) {
            const locationId = parseInt(String(parsed.param));
            const settingsRepo = new UserSettingsRepository();
            const settings = await settingsRepo.findByUserId(user.id);
            
            if (settings) {
              await settingsRepo.update(settings.id, {
                defaultLocation: { connect: { id: locationId } }
              });
            } else {
              await settingsRepo.create({
                user: { connect: { id: user.id } },
                defaultLocation: { connect: { id: locationId } }
              });
            }
            
            await ctx.answerCbQuery('Город установлен по умолчанию');
            
            // Возвращаемся к списку
            const locationRepo = new LocationRepository();
            const locations = await locationRepo.findByUserId(user.id);
            const text = `📍 Мои города (${locations.length}):\n\nВыберите город для просмотра или управления:`;
            await ctx.editMessageText(text, getCitySelectionKeyboard(locations, 'settings'));
          }
        }
        break;
      }
      
      case 'units': {
        if (parsed.action === 'show') {
          const settingsRepo = new UserSettingsRepository();
          const settings = await settingsRepo.findByUserId(user.id);
          const currentUnit = settings?.temperatureUnit === 'FAHRENHEIT' ? 'imperial' : 'metric';
          
          const text = `🌡️ Единицы измерения\n\nТекущие единицы: ${currentUnit === 'metric' ? 'Цельсий (°C)' : 'Фаренгейт (°F)'}\n\nВыберите единицы:`;
          
          const keyboard = Markup.inlineKeyboard([
            [
              Markup.button.callback('🌡️ Цельсий (°C)', SettingsCallback.create('units', 'set', 'metric'))
            ],
            [
              Markup.button.callback('🌡️ Фаренгейт (°F)', SettingsCallback.create('units', 'set', 'imperial'))
            ],
            [
              Markup.button.callback('⬅️ Назад', SettingsCallback.create('main', 'show'))
            ]
          ]);
          
          await ctx.editMessageText(text, keyboard);
        } else if (parsed.action === 'set') {
          const unit = parsed.param === 'imperial' ? 'FAHRENHEIT' : 'CELSIUS';
          const settingsRepo = new UserSettingsRepository();
          const settings = await settingsRepo.findByUserId(user.id);
          
          if (settings) {
            await settingsRepo.update(settings.id, { temperatureUnit: unit });
          } else {
            await settingsRepo.create({
              user: { connect: { id: user.id } },
              temperatureUnit: unit
            });
          }
          
          await ctx.answerCbQuery(`Единицы изменены на ${parsed.param === 'imperial' ? 'Фаренгейт' : 'Цельсий'}`);
          
          // Возвращаемся к настройкам единиц
          const text = `🌡️ Единицы измерения\n\nТекущие единицы: ${parsed.param === 'imperial' ? 'Фаренгейт (°F)' : 'Цельсий (°C)'}\n\nВыберите единицы:`;
          const keyboard = Markup.inlineKeyboard([
            [
              Markup.button.callback('🌡️ Цельсий (°C)', SettingsCallback.create('units', 'set', 'metric'))
            ],
            [
              Markup.button.callback('🌡️ Фаренгейт (°F)', SettingsCallback.create('units', 'set', 'imperial'))
            ],
            [
              Markup.button.callback('⬅️ Назад', SettingsCallback.create('main', 'show'))
            ]
          ]);
          await ctx.editMessageText(text, keyboard);
        }
        break;
      }
      
      default:
        logger.warn(`Unknown settings section: ${parsed.section}`);
    }
  } catch (error) {
    logger.error('Error in settings handler:', error);
    const errorMessage = handleError(ctx, error);
    await ctx.reply(errorMessage);
  }
}

/**
 * Обработка текстового сообщения для добавления города
 */
export async function handleCityInput(
  ctx: Context,
  cityName: string
): Promise<boolean> {
  const userId = ctx.from?.id;
  if (!userId) return false;

  try {
    const telegramId = userId.toString();
    const userRepo = new UserRepository();
    const user = await userRepo.findByTelegramId(telegramId);
    
    if (!user) return false;
    
    // Геокодируем город
    const geocoded = await geocodeCity(cityName);
    if (!geocoded) {
      await ctx.reply('❌ Город не найден. Попробуйте другой вариант.');
      return true;
    }
    
    const locationRepo = new LocationRepository();
    
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
        countryCode: null,
        user: { connect: { id: user.id } }
      });
      
      await ctx.reply(`✅ Город "${geocoded.name}" добавлен!`);
    } else {
      await ctx.reply(`ℹ️ Город "${geocoded.name}" уже есть в вашем списке.`);
    }
    
    return true;
  } catch (error) {
    logger.error('Error adding city:', error);
    return false;
  }
}

/**
 * Обработка геолокации
 */
export async function handleLocation(
  ctx: Context,
  latitude: number,
  longitude: number
): Promise<boolean> {
  const userId = ctx.from?.id;
  if (!userId) return false;

  try {
    const telegramId = userId.toString();
    const userRepo = new UserRepository();
    const user = await userRepo.findByTelegramId(telegramId);
    
    if (!user) return false;
    
    const locationRepo = new LocationRepository();
    
    // Проверяем, есть ли уже такая локация
    const existing = await locationRepo.findByUserId(user.id);
    let location = existing.find(l => 
      Math.abs(l.latitude - latitude) < 0.01 &&
      Math.abs(l.longitude - longitude) < 0.01
    );
    
    if (!location) {
      // Создаем новую локацию
      location = await locationRepo.create({
        name: 'Моё местоположение',
        latitude,
        longitude,
        countryCode: null,
        user: { connect: { id: user.id } }
      });
      
      await ctx.reply('✅ Ваше местоположение добавлено!');
    } else {
      await ctx.reply('ℹ️ Это местоположение уже есть в вашем списке.');
    }
    
    return true;
  } catch (error) {
    logger.error('Error adding location:', error);
    return false;
  }
}

