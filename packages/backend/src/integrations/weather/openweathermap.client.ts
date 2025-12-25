/**
 * OpenWeatherMap API Client
 * 
 * Клиент для работы с OpenWeatherMap API.
 * Выполняет HTTP запросы к внешнему API погоды.
 * Не содержит бизнес-логики, только HTTP-коммуникация.
 */

import { logger } from '../../shared/utils/logger';
import {
  WeatherError,
  WeatherErrorCode,
  type Coordinates,
} from '../../shared/types/weather.types';

/**
 * Константы OpenWeatherMap API
 */
const BASE_URL = 'http://api.openweathermap.org/data/2.5';
const TIMEOUT_MS = 10000; // 10 секунд
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000; // 1 секунда

/**
 * Raw ответ от OpenWeatherMap API (Current Weather)
 */
export interface OpenWeatherCurrentResponse {
  coord: {
    lat: number;
    lon: number;
  };
  weather: Array<{
    id: number;
    main: string;
    description: string;
    icon: string;
  }>;
  base?: string;
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    humidity: number;
  };
  visibility?: number;
  wind?: {
    speed: number;
    deg?: number;
    gust?: number;
  };
  clouds?: {
    all: number;
  };
  dt: number;
  sys?: {
    type?: number;
    id?: number;
    country?: string;
    sunrise?: number;
    sunset?: number;
  };
  timezone?: number;
  id?: number;
  name: string;
  cod?: number;
}

/**
 * Raw ответ от OpenWeatherMap API (Forecast)
 */
export interface OpenWeatherForecastResponse {
  cod: string;
  message?: number;
  cnt: number;
  list: Array<{
    dt: number;
    main: {
      temp: number;
      feels_like: number;
      temp_min: number;
      temp_max: number;
      pressure: number;
      humidity: number;
      sea_level?: number;
      grnd_level?: number;
      temp_kf?: number;
    };
    weather: Array<{
      id: number;
      main: string;
      description: string;
      icon: string;
    }>;
    clouds?: {
      all: number;
    };
    wind?: {
      speed: number;
      deg?: number;
      gust?: number;
    };
    visibility?: number;
    pop?: number; // Probability of precipitation
    rain?: {
      '3h'?: number;
    };
    snow?: {
      '3h'?: number;
    };
    sys?: {
      pod?: string;
    };
    dt_txt: string;
  }>;
  city: {
    id: number;
    name: string;
    coord: {
      lat: number;
      lon: number;
    };
    country: string;
    population?: number;
    timezone: number;
    sunrise?: number;
    sunset?: number;
  };
}

/**
 * Параметры запроса
 */
interface RequestParams {
  lat: number;
  lon: number;
  appid: string;
  units: 'metric' | 'imperial' | 'standard';
  lang: string;
  cnt?: number; // Для forecast
}

/**
 * OpenWeatherMap API Client
 */
export class OpenWeatherMapClient {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;
  private maxRetries: number;
  private retryDelay: number;

  constructor(
    apiKey: string,
    options: {
      baseUrl?: string;
      timeout?: number;
      maxRetries?: number;
      retryDelay?: number;
    } = {}
  ) {
    if (!apiKey) {
      throw new Error('OpenWeatherMap API key is required');
    }

    this.apiKey = apiKey;
    this.baseUrl = options.baseUrl || BASE_URL;
    this.timeout = options.timeout || TIMEOUT_MS;
    this.maxRetries = options.maxRetries || MAX_RETRIES;
    this.retryDelay = options.retryDelay || RETRY_DELAY_MS;
  }

  /**
   * Получить текущую погоду
   */
  async getCurrentWeather(
    coordinates: Coordinates,
    options: {
      units?: 'metric' | 'imperial' | 'standard';
      lang?: string;
    } = {}
  ): Promise<OpenWeatherCurrentResponse> {
    const params: RequestParams = {
      lat: coordinates.latitude,
      lon: coordinates.longitude,
      appid: this.apiKey,
      units: options.units || 'metric',
      lang: options.lang || 'ru',
    };

    const url = `${this.baseUrl}/weather`;
    return this.request<OpenWeatherCurrentResponse>(url, params);
  }

  /**
   * Получить прогноз погоды
   */
  async getForecast(
    coordinates: Coordinates,
    options: {
      units?: 'metric' | 'imperial' | 'standard';
      lang?: string;
      cnt?: number; // Количество интервалов (по умолчанию 40 = 5 дней)
    } = {}
  ): Promise<OpenWeatherForecastResponse> {
    const params: RequestParams = {
      lat: coordinates.latitude,
      lon: coordinates.longitude,
      appid: this.apiKey,
      units: options.units || 'metric',
      lang: options.lang || 'ru',
      cnt: options.cnt || 40, // 5 дней * 8 интервалов по 3 часа
    };

    const url = `${this.baseUrl}/forecast`;
    return this.request<OpenWeatherForecastResponse>(url, params);
  }

  /**
   * Выполнить HTTP запрос с retry
   */
  private async request<T>(
    url: string,
    params: Record<string, any>
  ): Promise<T> {
    const queryString = new URLSearchParams(
      Object.entries(params).reduce(
        (acc, [key, value]) => {
          acc[key] = String(value);
          return acc;
        },
        {} as Record<string, string>
      )
    ).toString();

    const fullUrl = `${url}?${queryString}`;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          logger.debug(
            `Retrying request (attempt ${attempt + 1}/${this.maxRetries + 1}): ${url}`
          );
          await this.delay(this.retryDelay * attempt);
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(fullUrl, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const error = await this.handleErrorResponse(response);
          throw error;
        }

        const data = await response.json();

        // Проверка на ошибки в ответе (OpenWeatherMap иногда возвращает 200 с ошибкой)
        if (data.cod && data.cod !== '200' && data.cod !== 200) {
          throw this.createErrorFromResponse(data);
        }

        return data as T;
      } catch (error) {
        lastError = error as Error;

        // Если это WeatherError, не повторяем запрос
        if (error instanceof WeatherError) {
          throw error;
        }

        // Если это AbortError (timeout), пробуем еще раз
        if (error instanceof Error && error.name === 'AbortError') {
          if (attempt < this.maxRetries) {
            continue;
          }
          throw new WeatherError(
            'Request timeout',
            WeatherErrorCode.TIMEOUT
          );
        }

        // Для других ошибок пробуем еще раз
        if (attempt < this.maxRetries) {
          continue;
        }
      }
    }

    // Если все попытки исчерпаны
    if (lastError instanceof WeatherError) {
      throw lastError;
    }

    throw new WeatherError(
      lastError?.message || 'Unknown error',
      WeatherErrorCode.NETWORK_ERROR
    );
  }

  /**
   * Обработать ответ с ошибкой
   */
  private async handleErrorResponse(
    response: Response
  ): Promise<WeatherError> {
    const status = response.status;
    let errorData: any;

    try {
      errorData = await response.json();
    } catch {
      errorData = { message: response.statusText };
    }

    switch (status) {
      case 401:
        return new WeatherError(
          'Invalid API key',
          WeatherErrorCode.INVALID_API_KEY,
          status
        );
      case 404:
        return new WeatherError(
          'Location not found',
          WeatherErrorCode.NOT_FOUND,
          status
        );
      case 429:
        return new WeatherError(
          'Rate limit exceeded',
          WeatherErrorCode.RATE_LIMIT,
          status
        );
      default:
        return new WeatherError(
          errorData.message || `HTTP ${status}`,
          WeatherErrorCode.UNKNOWN_ERROR,
          status
        );
    }
  }

  /**
   * Создать ошибку из ответа API
   */
  private createErrorFromResponse(data: any): WeatherError {
    const code = data.cod;
    const message = data.message || 'Unknown error';

    if (code === '401' || code === 401) {
      return new WeatherError(
        'Invalid API key',
        WeatherErrorCode.INVALID_API_KEY,
        401
      );
    }

    if (code === '404' || code === 404) {
      return new WeatherError(
        'Location not found',
        WeatherErrorCode.NOT_FOUND,
        404
      );
    }

    return new WeatherError(message, WeatherErrorCode.UNKNOWN_ERROR);
  }

  /**
   * Задержка
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
