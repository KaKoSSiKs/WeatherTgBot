/**
 * Сервис для получения данных о погоде от API.
 * Поддерживает кэширование и переключение на резервный API.
 */

import axios, { AxiosError } from 'axios';
import NodeCache from 'node-cache';
import { appConfig } from '../config';
import { logger } from '../utils/logger';
import type { WeatherData } from './weatherFormatter';
import type { Coordinates } from '../weather/provider';

const CACHE_TTL_SECONDS = 300; // 5 минут
const weatherCache = new NodeCache({ stdTTL: CACHE_TTL_SECONDS, checkperiod: 60 });

/**
 * Получить данные о текущей погоде по координатам
 */
export async function getCurrentWeatherByCoords(
  coords: Coordinates,
  cityName: string,
  countryCode: string = 'RU',
  timezone: string = 'Europe/Moscow'
): Promise<{ data: WeatherData | null; source: string; error?: string }> {
  const cacheKey = `weather:current:${coords.latitude},${coords.longitude}`;
  
  // Проверяем кэш
  const cached = weatherCache.get<WeatherData>(cacheKey);
  if (cached) {
    logger(`[WeatherService] cache hit for ${cacheKey}`);
    return { data: cached, source: 'cache' };
  }
  
  logger(`[WeatherService] cache miss for ${cacheKey}`);
  
  try {
    // Пытаемся получить данные от OpenWeatherMap
    const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
      params: {
        lat: coords.latitude,
        lon: coords.longitude,
        appid: appConfig.WEATHER_API_KEY,
        units: 'metric',
        lang: 'ru'
      },
      timeout: 10000
    });
    
    if (response.status === 200 && response.data) {
      const weatherData = parseOpenWeatherResponse(response.data);
      
      // Сохраняем в кэш
      weatherCache.set(cacheKey, weatherData);
      
      return { data: weatherData, source: 'openweathermap' };
    }
    
    return { data: null, source: 'api_error', error: 'Invalid response from API' };
    
  } catch (error) {
    logger('[WeatherService] error fetching weather:', error);
    
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 404) {
        return { data: null, source: 'api_error', error: 'city_not_found' };
      }
      if (axiosError.response?.status === 401) {
        return { data: null, source: 'api_error', error: 'invalid_api_key' };
      }
    }
    
    return { data: null, source: 'api_error', error: 'network_error' };
  }
}

/**
 * Получить данные о текущей погоде по ID города (из БД)
 */
export async function getCurrentWeatherByLocationId(
  locationId: number,
  cityName: string,
  coords: Coordinates,
  countryCode: string = 'RU',
  timezone: string = 'Europe/Moscow'
): Promise<{ data: WeatherData | null; source: string; error?: string }> {
  const cacheKey = `weather:location:${locationId}`;
  
  // Проверяем кэш
  const cached = weatherCache.get<WeatherData>(cacheKey);
  if (cached) {
    logger(`[WeatherService] cache hit for location ${locationId}`);
    return { data: cached, source: 'cache' };
  }
  
  // Получаем данные по координатам
  const result = await getCurrentWeatherByCoords(coords, cityName, countryCode, timezone);
  
  // Если данные получены, кэшируем по locationId
  if (result.data) {
    weatherCache.set(cacheKey, result.data);
  }
  
  return result;
}

/**
 * Принудительно обновить погоду (без использования кэша)
 */
export async function refreshWeather(
  coords: Coordinates,
  cityName: string,
  locationId?: number,
  countryCode: string = 'RU',
  timezone: string = 'Europe/Moscow'
): Promise<{ data: WeatherData | null; source: string; error?: string }> {
  // Удаляем старые данные из кэша
  const coordsCacheKey = `weather:current:${coords.latitude},${coords.longitude}`;
  weatherCache.del(coordsCacheKey);
  
  if (locationId) {
    const locationCacheKey = `weather:location:${locationId}`;
    weatherCache.del(locationCacheKey);
  }
  
  // Получаем свежие данные
  return await getCurrentWeatherByCoords(coords, cityName, countryCode, timezone);
}

/**
 * Парсить ответ от OpenWeatherMap API
 */
function parseOpenWeatherResponse(data: any): WeatherData {
  const main = data.main || {};
  const weather = (data.weather || [{}])[0] || {};
  const wind = data.wind || {};
  const sys = data.sys || {};
  
  return {
    condition: weather.description ? weather.description.charAt(0).toUpperCase() + weather.description.slice(1) : 'Неизвестно',
    temp: main.temp || 0,
    feelsLike: main.feels_like || main.temp || 0,
    humidity: main.humidity || 0,
    pressure: main.pressure || 0, // OpenWeatherMap возвращает в гПа
    visibility: data.visibility || 0, // в метрах
    windSpeed: wind.speed || 0, // в м/с
    windDeg: wind.deg || 0,
    sunrise: sys.sunrise,
    sunset: sys.sunset,
    timezone: data.timezone ? `UTC${data.timezone >= 0 ? '+' : ''}${data.timezone / 3600}` : undefined,
    cityName: data.name || '',
    country: sys.country || '',
    warning: undefined
  };
}

/**
 * Получить статистику кэша
 */
export function getWeatherCacheStats() {
  return weatherCache.getStats();
}

