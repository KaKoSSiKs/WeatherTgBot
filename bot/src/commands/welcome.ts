import type { Bot, Context } from 'grammy';
import { InlineKeyboard } from 'grammy';
import { mainMenuKeyboard, MAIN_MENU_TEXT } from '../keyboards';
import { DEFAULT_CITY } from '../utils/geocoding';
import type { WeatherProvider } from '../weather/provider';
import { startSetupWizard } from '../dialogs/setup';
import { logger } from '../utils/logger';
import { MenuCallback, ForecastCallback, NavCallback } from '../keyboards/callback_data';
import { resetToMainMenu, pushNavigationState, popNavigationState, type NavigationState } from '../utils/navigation';
import { addNavigationButtons } from '../keyboards/navigation';

/**
 * Восстанавливает предыдущее состояние навигации
 */
async function restoreNavigationState(ctx: Context, userId: number, state: NavigationState) {
  const screen = state.screen;
  
  switch (screen) {
    case 'main_menu': {
      const result = await ctx.editMessageText(MAIN_MENU_TEXT, {
        reply_markup: mainMenuKeyboard()
      });
      if (result && typeof result === 'object' && 'message_id' in result) {
        pushNavigationState(userId, 'main_menu', {}, result.message_id);
      }
      break;
    }
    case 'current_weather': {
      // Восстанавливаем экран текущей погоды
      // TODO: Реализовать полное восстановление с данными из state.data
      const keyboard = new InlineKeyboard();
        addNavigationButtons(keyboard, userId);
        const result = await ctx.editMessageText(
          '🌤️ Текущая погода\n\nНажмите на кнопку "🌤️ Текущая погода" в главном меню для обновления.',
          { reply_markup: keyboard }
        );
        if (result && typeof result === 'object' && 'message_id' in result) {
          pushNavigationState(userId, 'current_weather', state.data, result.message_id);
        }
      break;
    }
    case 'settings': {
      const settingsKeyboard = new InlineKeyboard();
      addNavigationButtons(settingsKeyboard, userId);
      const result = await ctx.editMessageText('⚙️ Настройки\n\nРаздел в разработке.', {
        reply_markup: settingsKeyboard
      });
      if (result && typeof result === 'object' && 'message_id' in result) {
        pushNavigationState(userId, 'settings', {}, result.message_id);
      }
      break;
    }
    case 'help': {
      const helpText = `❓ Помощь

Я могу помочь вам с:
• Текущей погодой в вашем городе
• Прогнозами на день, 3, 7 и 10 дней
• Настройкой автоматических уведомлений
• Рекомендациями по одежде

Используйте кнопки меню для навигации.`;
      const helpKeyboard = new InlineKeyboard();
      addNavigationButtons(helpKeyboard, userId);
      const result = await ctx.editMessageText(helpText, {
        reply_markup: helpKeyboard
      });
      if (result && typeof result === 'object' && 'message_id' in result) {
        pushNavigationState(userId, 'help', {}, result.message_id);
      }
      break;
    }
    default: {
      // По умолчанию возвращаемся в главное меню
      resetToMainMenu(userId);
      const result = await ctx.editMessageText(MAIN_MENU_TEXT, {
        reply_markup: mainMenuKeyboard()
      });
      if (result && typeof result === 'object' && 'message_id' in result) {
        pushNavigationState(userId, 'main_menu', {}, result.message_id);
      }
    }
  }
}

function formatWelcomeWeather(city: string, temp: number, feelsLike: number, conditions: string, notice?: string) {
  const lines = [
    `🌤️ Погода в ${city}: ${Math.round(temp)}°C (ощущается как ${Math.round(feelsLike)}°C), ${conditions}`
  ];
  if (notice) {
    lines.push(`⚠️ ${notice}`);
  }
  lines.push('', 'Используйте /weather для других городов.');
  return lines.join('\n');
}

export function registerWelcomeCommand(bot: Bot<Context>, weatherProvider: WeatherProvider) {
  // Обработчик команды /start
  bot.command('start', async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    // Сбрасываем навигацию и устанавливаем главное меню
    resetToMainMenu(userId);
    
    const message = await ctx.reply(MAIN_MENU_TEXT, {
      reply_markup: mainMenuKeyboard()
    });
    pushNavigationState(userId, 'main_menu', {}, message.message_id);
  });

  // Обработчик callback'ов главного меню
  bot.callbackQuery(/^menu:/, async (ctx) => {
    const data = ctx.callbackQuery.data ?? '';
    const userId = ctx.from?.id;
    
    if (!userId) return;

    // Обработка ошибок для answerCallbackQuery
    try {
      await ctx.answerCallbackQuery();
    } catch (error: any) {
      // Игнорируем ошибки "протухших" callback'ов
      if (error.description?.includes('query is too old')) {
        return;
      }
      // Пробрасываем другие ошибки
      throw error;
    }

    const parsed = MenuCallback.parse(data);
    if (!parsed) {
      await ctx.reply('Неизвестная команда. Попробуйте ещё раз.');
      return;
    }

    switch (parsed.action) {
      case 'current_weather': {
        try {
          const weather = await weatherProvider.getCurrentByCoords({
            latitude: DEFAULT_CITY.latitude,
            longitude: DEFAULT_CITY.longitude
          });
          const keyboard = new InlineKeyboard();
          addNavigationButtons(keyboard, userId);
          
          const message = await ctx.reply(
            formatWelcomeWeather(
              DEFAULT_CITY.name,
              weather.temperature,
              weather.feelsLike,
              weather.conditions,
              weather.notice
            ),
            { reply_markup: keyboard }
          );
          pushNavigationState(userId, 'current_weather', { city: DEFAULT_CITY.name }, message.message_id);
        } catch (error) {
          logger('Welcome weather error:', error);
          await ctx.reply('Не удалось получить погоду. Попробуйте команду /weather позже.');
        }
        break;
      }
      case 'settings': {
        const settingsKeyboard = new InlineKeyboard();
        addNavigationButtons(settingsKeyboard, userId);
        const message = await ctx.reply('⚙️ Настройки\n\nРаздел в разработке.', {
          reply_markup: settingsKeyboard
        });
        pushNavigationState(userId, 'settings', {}, message.message_id);
        break;
      }
      case 'help': {
        const helpText = `❓ Помощь

Я могу помочь вам с:
• Текущей погодой в вашем городе
• Прогнозами на день, 3, 7 и 10 дней
• Настройкой автоматических уведомлений
• Рекомендациями по одежде

Используйте кнопки меню для навигации.`;
        const helpKeyboard = new InlineKeyboard();
        addNavigationButtons(helpKeyboard, userId);
        const message = await ctx.reply(helpText, {
          reply_markup: helpKeyboard
        });
        pushNavigationState(userId, 'help', {}, message.message_id);
        break;
      }
      default:
        await ctx.reply('Неизвестная команда. Попробуйте ещё раз.');
    }
  });

  // Обработчик callback'ов прогнозов
  bot.callbackQuery(/^forecast:/, async (ctx) => {
    const data = ctx.callbackQuery.data ?? '';
    const userId = ctx.from?.id;
    
    if (!userId) return;

    try {
      await ctx.answerCallbackQuery();
    } catch (error: any) {
      if (error.description?.includes('query is too old')) {
        return;
      }
      throw error;
    }

    const parsed = ForecastCallback.parse(data);
    if (!parsed) {
      await ctx.reply('Ошибка обработки запроса.');
      return;
    }

    // TODO: Реализовать получение прогноза
    const forecastText = `📅 Прогноз на ${parsed.type === 'day' ? 'день' : parsed.type === '3day' ? '3 дня' : parsed.type === '7day' ? '7 дней' : '10 дней'}\n\nРаздел в разработке.`;
    
    const keyboard = new InlineKeyboard();
    addNavigationButtons(keyboard, userId);
    
    const message = await ctx.reply(forecastText, {
      reply_markup: keyboard
    });
    pushNavigationState(userId, `forecast_${parsed.type}`, { type: parsed.type, cityId: parsed.cityId }, message.message_id);
  });

  // Обработчик навигационных callback'ов
  bot.callbackQuery(/^nav:/, async (ctx) => {
    const data = ctx.callbackQuery.data ?? '';
    const userId = ctx.from?.id;
    
    if (!userId) return;

    try {
      await ctx.answerCallbackQuery();
    } catch (error: any) {
      if (error.description?.includes('query is too old')) {
        return;
      }
      throw error;
    }

    const parsed = NavCallback.parse(data);
    if (!parsed) {
      return;
    }

    switch (parsed.action) {
      case 'back': {
        const previousState = popNavigationState(userId);
        if (!previousState) {
          // Если нет предыдущего состояния, возвращаемся в главное меню
          resetToMainMenu(userId);
          await ctx.editMessageText(MAIN_MENU_TEXT, {
            reply_markup: mainMenuKeyboard()
          });
          return;
        }

        // Восстанавливаем предыдущее состояние
        await restoreNavigationState(ctx, userId, previousState);
        break;
      }
      case 'main_menu': {
        resetToMainMenu(userId);
        const result = await ctx.editMessageText(MAIN_MENU_TEXT, {
          reply_markup: mainMenuKeyboard()
        });
        if (result && typeof result === 'object' && 'message_id' in result) {
          pushNavigationState(userId, 'main_menu', {}, result.message_id);
        }
        break;
      }
      case 'cancel': {
        resetToMainMenu(userId);
        const result = await ctx.editMessageText(MAIN_MENU_TEXT, {
          reply_markup: mainMenuKeyboard()
        });
        if (result && typeof result === 'object' && 'message_id' in result) {
          pushNavigationState(userId, 'main_menu', {}, result.message_id);
        }
        break;
      }
    }
  });
}