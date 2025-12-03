/**
 * Сервис для получения данных о погоде от API.
 * Поддерживает кэширование и переключение на резервный API.
 */

import axios, { AxiosError } from 'axios';
import NodeCache from 'node-cache';
import { DateTime } from 'luxon';
import { appConfig } from '../config';
import { logger } from '../utils/logger';
import type { WeatherData } from './weatherFormatter';
import type { Coordinates } from '../weather/provider';

const CACHE_TTL_SECONDS = 300; // 5 минут
const FORECAST_CACHE_TTL_SECONDS = 600; // 10 минут для прогнозов
const weatherCache = new NodeCache({ stdTTL: CACHE_TTL_SECONDS, checkperiod: 60 });

/**
 * Данные прогноза на день
 */
export interface DailyForecastData {
  date: Date;
  dateStr: string;
  condition: string;
  temp: number;
  tempMin: number;
  tempMax: number;
  feelsLike?: number;
  humidity: number;
  windSpeed: number;
  windDeg: number;
  pressure?: number;
  visibility?: number;
  sunrise?: number;
  sunset?: number;
  detailedHours?: HourlyForecastData[];
  warning?: string;
}

/**
 * Данные почасового прогноза
 */
export interface HourlyForecastData {
  time: string; // HH:mm
  hour: number;
  temp: number;
  feelsLike: number;
  condition: string;
  humidity: number;
  pressure?: number;
  windSpeed: number;
  windDeg: number;
}

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
 * Получить ежедневный прогноз на N дней
 */
export async function getDailyForecast(
  coords: Coordinates,
  cityName: string,
  days: number,
  locationId?: number,
  countryCode: string = 'RU',
  timezone: string = 'Europe/Moscow'
): Promise<{ data: DailyForecastData[] | null; source: string; error?: string }> {
  const maxDays = Math.min(days, 10); // Максимум 10 дней
  
  const cacheKey = locationId 
    ? `forecast:${locationId}:${maxDays}day`
    : `forecast:${coords.latitude},${coords.longitude}:${maxDays}day`;
  
  // Проверяем кэш
  const cached = weatherCache.get<DailyForecastData[]>(cacheKey);
  if (cached) {
    logger(`[WeatherService] cache hit for forecast ${maxDays} days`);
    // Возвращаем только запрошенное количество дней
    return { data: cached.slice(0, maxDays), source: 'cache' };
  }
  
  logger(`[WeatherService] cache miss for forecast ${maxDays} days`);
  
  try {
    // Пытаемся получить от OpenWeatherMap (5 дней максимум)
    const forecastData = await fetchDailyForecastOpenWeather(coords, maxDays);
    
    if (forecastData && forecastData.length > 0) {
      // Сохраняем в кэш с увеличенным TTL
      weatherCache.set(cacheKey, forecastData, FORECAST_CACHE_TTL_SECONDS);
      return { data: forecastData.slice(0, maxDays), source: 'openweathermap' };
    }
    
    return { data: null, source: 'api_error', error: 'No forecast data' };
    
  } catch (error) {
    logger('[WeatherService] error fetching forecast:', error);
    return { data: null, source: 'api_error', error: 'network_error' };
  }
}

/**
 * Получить почасовой прогноз на конкретный день
 */
export async function getHourlyForecast(
  coords: Coordinates,
  cityName: string,
  date: string, // 'today' или 'YYYY-MM-DD'
  locationId?: number,
  countryCode: string = 'RU',
  timezone: string = 'Europe/Moscow'
): Promise<{ data: HourlyForecastData[] | null; source: string; error?: string }> {
  const cacheKey = locationId
    ? `hourly:${locationId}:${date}`
    : `hourly:${coords.latitude},${coords.longitude}:${date}`;
  
  // Проверяем кэш
  const cached = weatherCache.get<HourlyForecastData[]>(cacheKey);
  if (cached) {
    logger(`[WeatherService] cache hit for hourly forecast ${date}`);
    return { data: cached, source: 'cache' };
  }
  
  logger(`[WeatherService] cache miss for hourly forecast ${date}`);
  
  try {
    // Получаем прогноз на 5 дней
    const forecastResult = await getDailyForecast(coords, cityName, 5, locationId, countryCode, timezone);
    
    if (!forecastResult.data) {
      return { data: null, source: forecastResult.source, error: forecastResult.error };
    }
    
    // Находим нужный день
    const targetDate = date === 'today' 
      ? DateTime.now().setZone(timezone).startOf('day')
      : DateTime.fromISO(date).setZone(timezone).startOf('day');
    
    const dayForecast = forecastResult.data.find(day => {
      const dayDate = DateTime.fromJSDate(day.date).setZone(timezone).startOf('day');
      return dayDate.equals(targetDate);
    });
    
    if (!dayForecast || !dayForecast.detailedHours) {
      return { data: null, source: 'date_not_found', error: 'Date not found in forecast' };
    }
    
    // Сохраняем в кэш
    weatherCache.set(cacheKey, dayForecast.detailedHours, FORECAST_CACHE_TTL_SECONDS);
    
    return { data: dayForecast.detailedHours, source: forecastResult.source };
    
  } catch (error) {
    logger('[WeatherService] error fetching hourly forecast:', error);
    return { data: null, source: 'api_error', error: 'network_error' };
  }
}

/**
 * Получить ежедневный прогноз от OpenWeatherMap
 */
async function fetchDailyForecastOpenWeather(
  coords: Coordinates,
  days: number
): Promise<DailyForecastData[] | null> {
  try {
    const response = await axios.get('https://api.openweathermap.org/data/2.5/forecast', {
      params: {
        lat: coords.latitude,
        lon: coords.longitude,
        appid: appConfig.WEATHER_API_KEY,
        units: 'metric',
        lang: 'ru',
        cnt: 40 // 5 дней * 8 интервалов по 3 часа
      },
      timeout: 10000
    });
    
    if (response.status === 200 && response.data) {
      return parseOpenWeatherForecast(response.data, days);
    }
    
    return null;
  } catch (error) {
    logger('[WeatherService] error fetching OpenWeatherMap forecast:', error);
    return null;
  }
}

/**
 * Парсить прогноз от OpenWeatherMap
 */
function parseOpenWeatherForecast(data: any, days: number): DailyForecastData[] {
  try {
    const city = data.city || {};
    const list = data.list || [];
    
    // Группируем по дням
    const dailyForecasts = new Map<string, {
      date: DateTime;
      items: any[];
      tempMin: number;
      tempMax: number;
      conditions: string[];
      humidityValues: number[];
      windSpeeds: number[];
    }>();
    
    for (const item of list) {
      const dt = DateTime.fromSeconds(item.dt);
      const dateKey = dt.toFormat('yyyy-MM-dd');
      
      if (!dailyForecasts.has(dateKey)) {
        dailyForecasts.set(dateKey, {
          date: dt,
          items: [],
          tempMin: Infinity,
          tempMax: -Infinity,
          conditions: [],
          humidityValues: [],
          windSpeeds: []
        });
      }
      
      const dayData = dailyForecasts.get(dateKey)!;
      dayData.items.push(item);
      
      const temp = item.main?.temp || 0;
      dayData.tempMin = Math.min(dayData.tempMin, temp);
      dayData.tempMax = Math.max(dayData.tempMax, temp);
      dayData.conditions.push(item.weather?.[0]?.description || 'Неизвестно');
      dayData.humidityValues.push(item.main?.humidity || 0);
      dayData.windSpeeds.push(item.wind?.speed || 0);
    }
    
    // Преобразуем в нужный формат
    const forecasts: DailyForecastData[] = [];
    const sortedDates = Array.from(dailyForecasts.keys()).sort().slice(0, days);
    
    for (const dateKey of sortedDates) {
      const dayData = dailyForecasts.get(dateKey)!;
      
      // Наиболее частое условие
      const conditionCounts = new Map<string, number>();
      for (const condition of dayData.conditions) {
        conditionCounts.set(condition, (conditionCounts.get(condition) || 0) + 1);
      }
      const mostCommonCondition = Array.from(conditionCounts.entries())
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Неизвестно';
      
      // Средние значения
      const avgHumidity = dayData.humidityValues.reduce((a, b) => a + b, 0) / dayData.humidityValues.length;
      const avgWindSpeed = dayData.windSpeeds.reduce((a, b) => a + b, 0) / dayData.windSpeeds.length;
      
      // Извлекаем почасовой прогноз
      const detailedHours = extractHourlyForecast(dayData.items);
      
      forecasts.push({
        date: dayData.date.toJSDate(),
        dateStr: dayData.date.toFormat('dd.MM.yyyy'),
        condition: mostCommonCondition.charAt(0).toUpperCase() + mostCommonCondition.slice(1),
        temp: Math.round(((dayData.tempMin + dayData.tempMax) / 2) * 10) / 10,
        tempMin: Math.round(dayData.tempMin * 10) / 10,
        tempMax: Math.round(dayData.tempMax * 10) / 10,
        feelsLike: dayData.items[0]?.main?.feels_like || (dayData.tempMin + dayData.tempMax) / 2,
        humidity: Math.round(avgHumidity),
        windSpeed: Math.round(avgWindSpeed * 10) / 10,
        windDeg: dayData.items[0]?.wind?.deg || 0,
        pressure: dayData.items[0]?.main?.pressure || 1013,
        visibility: 10000, // Примерное значение
        sunrise: city.sunrise,
        sunset: city.sunset,
        detailedHours
      });
    }
    
    return forecasts;
  } catch (error) {
    logger('[WeatherService] error parsing OpenWeatherMap forecast:', error);
    return [];
  }
}

/**
 * Извлечь почасовой прогноз из дневных данных
 */
function extractHourlyForecast(dayItems: any[]): HourlyForecastData[] {
  const hourly: HourlyForecastData[] = [];
  
  for (const item of dayItems) {
    const dt = DateTime.fromSeconds(item.dt);
    const weather = item.weather?.[0] || {};
    const main = item.main || {};
    const wind = item.wind || {};
    
    hourly.push({
      time: dt.toFormat('HH:mm'),
      hour: dt.hour,
      temp: main.temp || 0,
      feelsLike: main.feels_like || main.temp || 0,
      condition: weather.description || 'Неизвестно',
      humidity: main.humidity || 0,
      pressure: main.pressure,
      windSpeed: wind.speed || 0,
      windDeg: wind.deg || 0
    });
  }
  
  return hourly;
}

/**
 * Получить статистику кэша
 */
export function getWeatherCacheStats() {
  return weatherCache.getStats();
}

