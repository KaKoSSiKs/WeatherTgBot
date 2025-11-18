import type { Bot, Context } from 'grammy';
import { mainMenuKeyboard } from '../keyboards';
import { DEFAULT_CITY } from '../utils/geocoding';
import type { WeatherProvider } from '../weather/provider';
import { startSetupWizard } from '../dialogs/setup';
import { logger } from '../utils/logger';

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
  bot.command('start', async (ctx) => {
    await ctx.reply(
      'Добро пожаловать в WeatherBot! Выберите действие ниже, чтобы мгновенно получить прогноз или настроить персональные уведомления.',
      { reply_markup: mainMenuKeyboard() }
    );
  });

  bot.callbackQuery(/^menu:/, async (ctx) => {
    const data = ctx.callbackQuery.data ?? '';
    
    // ✅ ДОБАВИТЬ ОБРАБОТКУ ОШИБОК ДЛЯ answerCallbackQuery
    try {
      await ctx.answerCallbackQuery();
    } catch (error) {
      // Игнорируем ошибки "протухших" callback'ов
      if (error.description?.includes('query is too old')) {
        return;
      }
      // Пробрасываем другие ошибки
      throw error;
    }

    switch (data) {
      case 'menu:get_weather': {
        try {
          const weather = await weatherProvider.getCurrentByCoords({
            latitude: DEFAULT_CITY.latitude,
            longitude: DEFAULT_CITY.longitude
          });
          await ctx.reply(
            formatWelcomeWeather(
              DEFAULT_CITY.name,
              weather.temperature,
              weather.feelsLike,
              weather.conditions,
              weather.notice
            )
          );
        } catch (error) {
          logger('Welcome weather error:', error);
          await ctx.reply('Не удалось получить погоду. Попробуйте команду /weather позже.');
        }
        break;
      }
      case 'menu:setup_notifications':
      case 'menu:set_location': {
        await startSetupWizard(ctx, 'setup');
        break;
      }
      default:
        await ctx.reply('Неизвестная команда. Попробуйте ещё раз.');
    }
  });
}