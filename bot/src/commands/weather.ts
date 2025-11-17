import type { Bot, Context } from 'grammy';
import type { WeatherProvider, Coordinates, WeatherCurrent } from '../weather/provider';
import { prisma } from '../db/prisma';
import { getOrCreateUser } from '../db/user';
import { DEFAULT_CITY, geocodeCity } from '../utils/geocoding';
import { logger } from '../utils/logger';

function formatWeatherMessage(city: string, weather: WeatherCurrent): string {
  const temperature = Math.round(weather.temperature);
  const feelsLike = Math.round(weather.feelsLike);
  const base =
    `🌤️ Погода в ${city}: ${temperature}°C (ощущается как ${feelsLike}°C), ${weather.conditions}`;
  return weather.notice ? `${base}\n⚠️ ${weather.notice}` : base;
}

async function resolveUserLocation(userId: number, fallbackCity = DEFAULT_CITY) {
  const lastLocation = await prisma.location.findFirst({
    where: { userId },
    orderBy: { id: 'desc' }
  });

  if (lastLocation) {
    return {
      name: lastLocation.name,
      coordinates: {
        latitude: lastLocation.latitude,
        longitude: lastLocation.longitude
      }
    };
  }

  return {
    name: fallbackCity.name,
    coordinates: {
      latitude: fallbackCity.latitude,
      longitude: fallbackCity.longitude
    }
  };
}

export function registerWeatherCommand(bot: Bot<Context>, provider: WeatherProvider) {
  bot.command('weather', async (ctx) => {
    let locationLabel = 'указанного места';
    try {
      const telegramId = ctx.from?.id?.toString();
      if (!telegramId) {
        await ctx.reply('Ошибка: не удалось определить ваш ID.');
        return;
      }

      const user = await getOrCreateUser(telegramId, ctx.from?.language_code);
      const fullText = ctx.message?.text ?? '';
      const locationQuery = fullText.replace(/^\/weather\s*/i, '').trim();
      if (locationQuery) {
        locationLabel = locationQuery;
      }

      let targetCity = DEFAULT_CITY.name;
      let coordinates: Coordinates = {
        latitude: DEFAULT_CITY.latitude,
        longitude: DEFAULT_CITY.longitude
      };

      if (locationQuery.length > 0) {
        const geocoded = geocodeCity(locationQuery);
        if (!geocoded) {
          await ctx.reply(`Местоположение "${locationQuery}" не найдено.`);
          return;
        }
        targetCity = geocoded.name;
        coordinates = {
          latitude: geocoded.latitude,
          longitude: geocoded.longitude
        };
      } else {
        const savedLocation = await resolveUserLocation(user.id);
        targetCity = savedLocation.name;
        coordinates = savedLocation.coordinates;
        locationLabel = savedLocation.name;
      }

      const started = Date.now();
      const weather = await provider.getCurrentByCoords(coordinates);
      const duration = Date.now() - started;
      logger('[WeatherCommand] response time', duration, 'ms', { targetCity });

      await ctx.reply(formatWeatherMessage(targetCity, weather));
    } catch (error) {
      logger('Error in /weather command:', error);
      await ctx.reply(`Не удалось получить погоду для ${locationLabel}. Попробуйте позже.`);
    }
  });
}


