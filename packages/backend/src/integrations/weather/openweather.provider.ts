/**
 * OpenWeather Provider
 * 
 * Реализация WeatherProvider для OpenWeatherMap API.
 * Нормализует данные от OpenWeatherMap в единый формат backend.
 */

import { OpenWeatherMapClient } from './openweathermap.client';
import type {
  OpenWeatherCurrentResponse,
  OpenWeatherForecastResponse,
} from './openweathermap.client';
import type { WeatherProvider } from './weather.provider';
import type {
  CurrentWeather,
  WeatherForecast,
  DailyForecast,
  HourlyForecast,
  Coordinates,
} from '../../shared/types/weather.types';

/**
 * OpenWeather Provider
 */
export class OpenWeatherProvider implements WeatherProvider {
  private client: OpenWeatherMapClient;

  constructor(
    apiKey: string,
    options: {
      baseUrl?: string;
      timeout?: number;
      maxRetries?: number;
      retryDelay?: number;
      units?: 'metric' | 'imperial' | 'standard';
      lang?: string;
    } = {}
  ) {
    this.client = new OpenWeatherMapClient(apiKey, {
      baseUrl: options.baseUrl,
      timeout: options.timeout,
      maxRetries: options.maxRetries,
      retryDelay: options.retryDelay,
    });
  }

  /**
   * Получить текущую погоду
   */
  async getCurrentWeather(coordinates: Coordinates): Promise<CurrentWeather> {
    const response = await this.client.getCurrentWeather(coordinates, {
      units: 'metric',
      lang: 'ru',
    });

    return this.normalizeCurrentWeather(response);
  }

  /**
   * Получить прогноз погоды
   */
  async getForecast(
    coordinates: Coordinates,
    days: number = 5
  ): Promise<WeatherForecast> {
    // OpenWeatherMap API 2.5 возвращает максимум 5 дней (40 интервалов по 3 часа)
    const requestedDays = Math.min(days, 5);
    const cnt = requestedDays * 8; // 8 интервалов в день (каждые 3 часа)

    const response = await this.client.getForecast(coordinates, {
      units: 'metric',
      lang: 'ru',
      cnt,
    });

    return this.normalizeForecast(response, coordinates);
  }

  /**
   * Нормализовать текущую погоду
   */
  private normalizeCurrentWeather(
    data: OpenWeatherCurrentResponse
  ): CurrentWeather {
    const main = data.main || {};
    const weather = (data.weather || [{}])[0] || {};
    const wind = data.wind || {};
    const clouds = data.clouds || {};

    return {
      temperature: main.temp ?? 0,
      feelsLike: main.feels_like ?? main.temp ?? 0,
      humidity: main.humidity ?? 0,
      pressure: main.pressure ?? 0,
      windSpeed: wind.speed ?? 0,
      windDirection: wind.deg,
      visibility: data.visibility,
      cloudiness: clouds.all,
      condition: weather.main || 'Unknown',
      description: weather.description || 'No description',
      icon: weather.icon || '01d',
      timestamp: new Date((data.dt || Date.now() / 1000) * 1000),
    };
  }

  /**
   * Нормализовать прогноз погоды
   */
  private normalizeForecast(
    data: OpenWeatherForecastResponse,
    coordinates: Coordinates
  ): WeatherForecast {
    const list = data.list || [];
    const city = data.city || {};

    // Группируем по дням для daily forecast
    const dailyMap = new Map<string, any[]>();
    
    list.forEach((item) => {
      const date = new Date(item.dt * 1000);
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
      
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, []);
      }
      dailyMap.get(dateKey)!.push(item);
    });

    // Преобразуем в DailyForecast
    const daily: DailyForecast[] = Array.from(dailyMap.entries())
      .slice(0, 5) // Максимум 5 дней
      .map(([dateKey, items]) => {
        const temps = items.map((item) => item.main.temp);
        const feelsLike = items.map((item) => item.main.feels_like);
        const weather = items[Math.floor(items.length / 2)]; // Берем средний элемент для описания дня

        return {
          date: new Date(dateKey),
          temperature: {
            min: Math.min(...temps),
            max: Math.max(...temps),
            day: temps[Math.floor(temps.length / 2)] || temps[0],
            night: temps[temps.length - 1] || temps[0],
          },
          feelsLike: {
            day: feelsLike[Math.floor(feelsLike.length / 2)] || feelsLike[0],
            night: feelsLike[feelsLike.length - 1] || feelsLike[0],
          },
          condition: weather.weather[0]?.main || 'Unknown',
          description: weather.weather[0]?.description || 'No description',
          icon: weather.weather[0]?.icon || '01d',
          humidity: weather.main.humidity || 0,
          pressure: weather.main.pressure || 0,
          windSpeed: weather.wind?.speed || 0,
          windDirection: weather.wind?.deg,
          cloudiness: weather.clouds?.all,
          precipitation: weather.pop !== undefined
            ? {
                probability: weather.pop,
                amount: weather.rain?.['3h'] || weather.snow?.['3h'],
              }
            : undefined,
        };
      });

    // Преобразуем в HourlyForecast
    const hourly: HourlyForecast[] = list.map((item) => {
      const main = item.main || {};
      const weather = (item.weather || [{}])[0] || {};
      const wind = item.wind || {};
      const clouds = item.clouds || {};

      return {
        time: new Date(item.dt * 1000),
        temperature: main.temp ?? 0,
        feelsLike: main.feels_like ?? main.temp ?? 0,
        condition: weather.main || 'Unknown',
        description: weather.description || 'No description',
        icon: weather.icon || '01d',
        humidity: main.humidity ?? 0,
        pressure: main.pressure ?? 0,
        windSpeed: wind.speed ?? 0,
        windDirection: wind.deg,
        cloudiness: clouds.all,
        precipitation: item.pop !== undefined
          ? {
              probability: item.pop,
              amount: item.rain?.['3h'] || item.snow?.['3h'],
            }
          : undefined,
        visibility: item.visibility,
      };
    });

    return {
      location: {
        name: city.name || 'Unknown',
        coordinates: {
          latitude: city.coord?.lat || coordinates.latitude,
          longitude: city.coord?.lon || coordinates.longitude,
        },
        countryCode: city.country,
      },
      daily,
      hourly,
      fetchedAt: new Date(),
    };
  }
}

