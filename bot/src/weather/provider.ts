import axios, { AxiosError } from 'axios';
import { performance } from 'node:perf_hooks';
import NodeCache from 'node-cache';
import { appConfig } from '../config';
import { logger } from '../utils/logger';

const CACHE_TTL_SECONDS = 300;
const weatherCache = new NodeCache({ stdTTL: CACHE_TTL_SECONDS, checkperiod: 60 });

export type Coordinates = { latitude: number; longitude: number };

export type WeatherCurrent = {
  temperature: number;
  feelsLike: number;
  conditions: string;
  humidity: number;
  pressure: number;
  windSpeed: number;
  notice?: string;
};

export interface WeatherProvider {
  getCurrentByCoords(coords: Coordinates): Promise<WeatherCurrent>;
}

export interface CacheStats {
  keys: number;
  hits: number;
  misses: number;
  ksize: number;
  vsize: number;
}

const mockDelay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

abstract class BaseWeatherProvider implements WeatherProvider {
  constructor(protected readonly providerName: string) {}

  abstract getCurrentByCoords(coords: Coordinates): Promise<WeatherCurrent>;

  protected async executeWithRetry<T>(
    action: () => Promise<T>,
    context: string,
    maxAttempts = 3
  ): Promise<T> {
    let attempt = 0;
    let lastError: unknown;
    while (attempt < maxAttempts) {
      const attemptLabel = `${this.providerName}:${context}:attempt-${attempt + 1}`;
      const started = performance.now();
      try {
        const result = await action();
        const duration = Math.round(performance.now() - started);
        logger(`[${attemptLabel}] success in ${duration}ms`);
        this.logCacheStats();
        return result;
      } catch (error) {
        attempt += 1;
        lastError = error;
        const duration = Math.round(performance.now() - started);
        logger(`[${attemptLabel}] failed in ${duration}ms`, this.describeError(error));
        if (attempt < maxAttempts) {
          const backoff = Math.pow(2, attempt) * 100;
          await mockDelay(backoff);
        }
      }
    }
    throw this.normalizeError(lastError);
  }

  protected normalizeError(error: unknown): Error {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        return new Error('Ошибка сервиса погоды: некорректный ответ API.');
      }
      if (axiosError.request) {
        return new Error('Ошибка сети: не удалось получить данные погоды.');
      }
      return new Error('Ошибка при формировании запроса к погодному сервису.');
    }
    if (error instanceof Error) {
      return error;
    }
    return new Error('Неизвестная ошибка при получении данных погоды.');
  }

  protected describeError(error: unknown): Record<string, unknown> {
    if (axios.isAxiosError(error)) {
      return {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        data: error.response?.data
      };
    }
    if (error instanceof Error) {
      return { message: error.message, stack: error.stack };
    }
    return { message: 'Unknown error type' };
  }

  protected logCacheStats(): void {
    const stats = weatherCache.getStats() as CacheStats;
    logger(
      `[${this.providerName}] cache stats`,
      `keys=${stats.keys}`,
      `hits=${stats.hits}`,
      `misses=${stats.misses}`,
      `ksize=${stats.ksize}`,
      `vsize=${stats.vsize}`
    );
  }
}

class OpenWeatherProvider extends BaseWeatherProvider {
  constructor() {
    super('OpenWeatherMap');
  }

  async getCurrentByCoords(coords: Coordinates): Promise<WeatherCurrent> {
    const cacheKey = `weather:${coords.latitude},${coords.longitude}`;
    const cached = weatherCache.get<WeatherCurrent>(cacheKey);
    if (cached) {
      logger(`[${this.providerName}] cache hit for ${cacheKey}`);
      return cached;
    }

    logger(`[${this.providerName}] cache miss for ${cacheKey}`);
    const result = await this.executeWithRetry(
      async () => {
        const started = performance.now();
        const { data } = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
          params: {
            lat: coords.latitude,
            lon: coords.longitude,
            appid: appConfig.WEATHER_API_KEY,
            units: appConfig.WEATHER_UNITS,
            lang: appConfig.WEATHER_API_LANG
          }
        });
        const duration = Math.round(performance.now() - started);
        logger(`[${this.providerName}] API request completed in ${duration}ms`);

        return {
          temperature: data.main?.temp ?? 0,
          feelsLike: data.main?.feels_like ?? 0,
          conditions: data.weather?.[0]?.description ?? 'n/a',
          humidity: data.main?.humidity ?? 0,
          pressure: data.main?.pressure ?? 0,
          windSpeed: data.wind?.speed ?? 0
        };
      },
      `coords:${coords.latitude},${coords.longitude}`
    );

    weatherCache.set(cacheKey, result);
    return result;
  }
}

class AccuWeatherProvider extends BaseWeatherProvider {
  constructor() {
    super('AccuWeather');
  }

  async getCurrentByCoords(coords: Coordinates): Promise<WeatherCurrent> {
    return this.executeWithRetry(async () => {
      await mockDelay(150);
      logger(`[${this.providerName}] returning mocked data for fallback`);
      return {
        temperature: 20,
        feelsLike: 19,
        conditions: 'Переменная облачность',
        humidity: 60,
        pressure: 1012,
        windSpeed: 3,
        notice: 'Сервис погоды временно недоступен. Используем альтернативный источник.'
      };
    }, `coords:${coords.latitude},${coords.longitude}`);
  }
}

class ProviderManager implements WeatherProvider {
  constructor(private readonly providers: WeatherProvider[]) {}

  async getCurrentByCoords(coords: Coordinates): Promise<WeatherCurrent> {
    for (let i = 0; i < this.providers.length; i += 1) {
      const provider = this.providers[i];
      try {
        const response = await provider.getCurrentByCoords(coords);
        if (i > 0 && !response.notice) {
          response.notice = 'Сервис погоды временно недоступен. Используем альтернативный источник.';
          logger(`[ProviderManager] fallback provider ${provider.constructor.name} used`);
        }
        return response;
      } catch (error) {
        logger(
          `[ProviderManager] provider ${provider.constructor.name} failed`,
          error instanceof Error ? error.message : error
        );
        if (i === this.providers.length - 1) {
          throw new Error('Сервис погоды временно недоступен. Попробуйте позже.');
        }
      }
    }
    throw new Error('Сервис погоды временно недоступен. Попробуйте позже.');
  }
}

export const openWeatherProvider = new OpenWeatherProvider();
export const accuWeatherProvider = new AccuWeatherProvider();
export const weatherProviderManager = new ProviderManager([
  openWeatherProvider,
  accuWeatherProvider
]);

export const MOCK_COORDINATES: Coordinates = {
  latitude: 55.7558,
  longitude: 37.6173
};

export function getWeatherCacheStats(): CacheStats {
  return weatherCache.getStats() as CacheStats;
}

export function getWeatherProvider(): WeatherProvider {
  switch (appConfig.WEATHER_API_PROVIDER) {
    case 'openweathermap':
    default:
      return weatherProviderManager;
  }
}
