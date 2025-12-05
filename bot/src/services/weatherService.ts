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
  timePeriods?: TimePeriodData;
  detailedRecommendation?: string;
}

/**
 * Данные периода суток (утро, день, вечер, ночь)
 */
export interface TimePeriodData {
  утро?: PeriodInfo;
  день?: PeriodInfo;
  вечер?: PeriodInfo;
  ночь?: PeriodInfo;
}

export interface PeriodInfo {
  start: number;
  end: number;
  emoji: string;
  avgTemp: number;
  avgWind: number;
  condition: string;
  hourCount: number;
  hoursData: HourlyForecastData[];
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
 * Принудительно обновить детальный прогноз (без использования кэша)
 */
export async function refreshDetailedForecast(
  coords: Coordinates,
  cityName: string,
  targetDate: string,
  locationId?: number,
  countryCode: string = 'RU',
  timezone: string = 'Europe/Moscow'
): Promise<{ data: DailyForecastData | null; source: string; error?: string }> {
  // Удаляем старые данные из кэша
  const cacheKey = locationId
    ? `detailed:${locationId}:${targetDate}`
    : `detailed:${coords.latitude},${coords.longitude}:${targetDate}`;
  weatherCache.del(cacheKey);

  // Получаем свежие данные
  return await getDetailedDailyForecast(
    coords,
    cityName,
    targetDate,
    locationId,
    countryCode,
    timezone
  );
}

/**
 * Получить детальный прогноз на конкретный день с дополнительными данными
 */
export async function getDetailedDailyForecast(
  coords: Coordinates,
  cityName: string,
  targetDate: string, // 'today' или 'YYYY-MM-DD'
  locationId?: number,
  countryCode: string = 'RU',
  timezone: string = 'Europe/Moscow',
  useCache: boolean = true
): Promise<{ data: DailyForecastData | null; source: string; error?: string }> {
  const cacheKey = locationId
    ? `detailed:${locationId}:${targetDate}`
    : `detailed:${coords.latitude},${coords.longitude}:${targetDate}`;

  // Проверяем кэш только если useCache = true
  if (useCache) {
    const cached = weatherCache.get<DailyForecastData>(cacheKey);
    if (cached) {
      logger(`[WeatherService] cache hit for detailed forecast ${targetDate}`);
      return { data: cached, source: 'cache' };
    }
  }

  logger(`[WeatherService] cache miss for detailed forecast ${targetDate}`);

  try {
    // Получаем прогноз на 5 дней для детализации
    const forecastResult = await getDailyForecast(
      coords,
      cityName,
      5,
      locationId,
      countryCode,
      timezone
    );

    if (!forecastResult.data || forecastResult.data.length === 0) {
      return { data: null, source: forecastResult.source, error: forecastResult.error };
    }

    // Определяем целевую дату
    const targetDateTime = targetDate === 'today'
      ? DateTime.now().setZone(timezone).startOf('day')
      : DateTime.fromISO(targetDate).setZone(timezone).startOf('day');

    // Ищем нужный день
    const dayForecast = forecastResult.data.find(forecast => {
      const forecastDate = DateTime.fromJSDate(forecast.date).setZone(timezone).startOf('day');
      return forecastDate.equals(targetDateTime);
    });

    if (!dayForecast) {
      return { data: null, source: 'date_not_found', error: 'Date not found in forecast' };
    }

    // Получаем текущую погоду для дополнительных данных
    const currentWeatherResult = await getCurrentWeatherByCoords(
      coords,
      cityName,
      countryCode,
      timezone
    );

    // Улучшаем детальный прогноз
    const enhancedForecast = await enhanceDetailedForecast(
      dayForecast,
      currentWeatherResult.data,
      targetDate,
      timezone
    );

    // Сохраняем в кэш с увеличенным TTL
    weatherCache.set(cacheKey, enhancedForecast, FORECAST_CACHE_TTL_SECONDS * 3);

    return { data: enhancedForecast, source: forecastResult.source };
  } catch (error) {
    logger('[WeatherService] error getting detailed forecast:', error);
    return { data: null, source: 'api_error', error: 'network_error' };
  }
}

/**
 * Улучшить детальный прогноз дополнительными данными
 */
async function enhanceDetailedForecast(
  dayForecast: DailyForecastData,
  currentWeather: WeatherData | null,
  targetDate: string,
  timezone: string
): Promise<DailyForecastData> {
  const enhanced = { ...dayForecast };

  // Добавляем данные, которых нет в прогнозе
  if (currentWeather) {
    if (!enhanced.pressure || enhanced.pressure === 0) {
      enhanced.pressure = currentWeather.pressure || 1013;
    }
    if (!enhanced.visibility || enhanced.visibility === 0) {
      enhanced.visibility = currentWeather.visibility || 10000;
    }
    if (!enhanced.feelsLike) {
      enhanced.feelsLike = currentWeather.feelsLike || enhanced.temp;
    }
  }

  // Добавляем детальные периоды суток
  enhanced.timePeriods = calculateTimePeriods(enhanced, timezone);

  // Добавляем предупреждения
  enhanced.warning = getWeatherWarning(enhanced);

  // Добавляем расширенные рекомендации
  enhanced.detailedRecommendation = getDetailedRecommendation(enhanced);

  return enhanced;
}

/**
 * Рассчитать данные для периодов суток (утро, день, вечер, ночь)
 */
function calculateTimePeriods(
  dayForecast: DailyForecastData,
  timezone: string
): TimePeriodData {
  // По ТЗ: утро 6-9, день 12-15, вечер 18-21, ночь 0-3
  const periods: TimePeriodData = {
    утро: { start: 6, end: 9, emoji: '☀️', avgTemp: 0, avgWind: 0, condition: '', hourCount: 0, hoursData: [] },
    день: { start: 12, end: 15, emoji: '🌤️', avgTemp: 0, avgWind: 0, condition: '', hourCount: 0, hoursData: [] },
    вечер: { start: 18, end: 21, emoji: '🌆', avgTemp: 0, avgWind: 0, condition: '', hourCount: 0, hoursData: [] },
    ночь: { start: 0, end: 3, emoji: '🌙', avgTemp: 0, avgWind: 0, condition: '', hourCount: 0, hoursData: [] }
  };

  const hourlyData = dayForecast.detailedHours || [];
  if (hourlyData.length === 0) {
    // Если нет почасовых данных, используем дневные средние
    for (const periodName in periods) {
      const period = periods[periodName as keyof TimePeriodData]!;
      period.avgTemp = dayForecast.temp;
      period.avgWind = dayForecast.windSpeed;
      period.condition = dayForecast.condition;
    }
    return periods;
  }

  // Группируем данные по периодам
  for (const periodName in periods) {
    const period = periods[periodName as keyof TimePeriodData]!;
    const startHour = period.start;
    const endHour = period.end;

    const periodHours = hourlyData.filter(hourData => {
      const hour = hourData.hour;
      if (startHour < endHour) {
        return hour >= startHour && hour < endHour;
      } else {
        // Для ночи (0-6)
        return hour >= startHour || hour < endHour;
      }
    });

    if (periodHours.length > 0) {
      // Рассчитываем средние значения
      const temps = periodHours.map(h => h.temp);
      const winds = periodHours.map(h => h.windSpeed);
      const conditions = periodHours.map(h => h.condition);

      // Наиболее частое условие
      const conditionCounts = new Map<string, number>();
      for (const condition of conditions) {
        conditionCounts.set(condition, (conditionCounts.get(condition) || 0) + 1);
      }
      const mostCommonCondition = Array.from(conditionCounts.entries())
        .sort((a, b) => b[1] - a[1])[0]?.[0] || dayForecast.condition;

      period.avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
      period.avgWind = winds.reduce((a, b) => a + b, 0) / winds.length;
      period.condition = mostCommonCondition;
      period.hourCount = periodHours.length;
      period.hoursData = periodHours;
    } else {
      // Если нет данных, используем дневные средние
      period.avgTemp = dayForecast.temp;
      period.avgWind = dayForecast.windSpeed;
      period.condition = dayForecast.condition;
      period.hourCount = 0;
      period.hoursData = [];
    }
  }

  return periods;
}

/**
 * Получить предупреждение МЧС на основе погодных условий
 */
function getWeatherWarning(forecast: DailyForecastData): string {
  try {
    const condition = (forecast.condition || '').toLowerCase();
    const temp = forecast.temp || 0;
    const windSpeed = forecast.windSpeed || 0;

    const warnings: string[] = [];

    // Предупреждения по температуре
    if (temp < -20) {
      warnings.push('сильные морозы');
    } else if (temp < -10) {
      warnings.push('морозы');
    } else if (temp > 35) {
      warnings.push('сильная жара');
    } else if (temp > 30) {
      warnings.push('жара');
    }

    // Предупреждения по ветру
    if (windSpeed > 15) {
      warnings.push('ураганный ветер');
    } else if (windSpeed > 10) {
      warnings.push('сильный ветер');
    }

    // Предупреждения по осадкам
    if (condition.includes('дождь')) {
      if (condition.includes('сильный') || condition.includes('ливень')) {
        warnings.push('сильный дождь');
      } else {
        warnings.push('дождь');
      }
    }

    if (condition.includes('снег')) {
      if (condition.includes('сильный') || condition.includes('метель')) {
        warnings.push('сильный снегопад');
      } else {
        warnings.push('снег');
      }
    }

    if (condition.includes('гроза')) {
      warnings.push('гроза');
    }

    if (condition.includes('туман') || condition.includes('дымка')) {
      warnings.push('плохая видимость');
    }

    // Формируем итоговое предупреждение
    if (warnings.length > 0) {
      return `МЧС предупреждает: ${warnings.join(', ')}.`;
    } else {
      return 'Предупреждений МЧС нет.';
    }
  } catch (error) {
    logger('[WeatherService] error generating weather warning:', error);
    return 'Информация о предупреждениях временно недоступна.';
  }
}

/**
 * Получить расширенные рекомендации по одежде и активности
 */
function getDetailedRecommendation(forecast: DailyForecastData): string {
  try {
    const temp = forecast.temp || 0;
    const feelsLike = forecast.feelsLike || temp;
    const condition = (forecast.condition || '').toLowerCase();
    const humidity = forecast.humidity || 50;
    const windSpeed = forecast.windSpeed || 0;

    const recommendations: string[] = [];

    // Рекомендации по одежде на основе температуры
    if (feelsLike < -15) {
      recommendations.push('❄️ Очень холодно - наденьте теплую зимнюю одежду, шапку, шарф и перчатки.');
      recommendations.push('👢 Обязательно носите теплую непромокаемую обувь.');
    } else if (feelsLike < -5) {
      recommendations.push('🧥 Холодно - наденьте зимнюю куртку или пальто, шапку.');
      recommendations.push('🧤 Перчатки или варежки будут не лишними.');
    } else if (feelsLike < 5) {
      recommendations.push('🧥 Прохладно - наденьте куртку или пальто.');
      recommendations.push('🧣 Легкий шарф может пригодиться.');
    } else if (feelsLike < 15) {
      recommendations.push('👔 Умеренно - легкая куртка или свитер будут комфортны.');
      recommendations.push('🧥 Имейте с собой легкую верхнюю одежду на случай ветра.');
    } else if (feelsLike < 25) {
      recommendations.push('👕 Тепло - футболка или рубашка с длинным рукавом.');
      recommendations.push('🧢 Можно надеть легкий головной убор от солнца.');
    } else {
      recommendations.push('🥵 Жарко - легкая одежда из натуральных тканей.');
      recommendations.push('🧢 Обязательно головной убор от солнца и солнцезащитный крем.');
    }

    // Дополнительные рекомендации по осадкам
    if (condition.includes('дождь')) {
      recommendations.push('☔ Возьмите с собой зонт или наденьте непромокаемую одежду.');
      recommendations.push('👟 Наденьте непромокаемую обувь.');
    }

    if (condition.includes('снег')) {
      recommendations.push('❄️ Одежда должна быть непромокаемой и теплой.');
      recommendations.push('👢 Обувь с нескользящей подошвой.');
    }

    if (condition.includes('ветер') || windSpeed > 5) {
      recommendations.push('💨 Ветрено - наденьте ветровку или одежду, которая не продувается.');
    }

    if (condition.includes('солнце') || condition.includes('ясно')) {
      if (temp > 20) {
        recommendations.push('☀️ Солнечно - используйте солнцезащитный крем SPF 30+.');
      }
    }

    // Рекомендации по влажности
    if (humidity > 80) {
      recommendations.push('💧 Высокая влажность - одежда из дышащих тканей будет комфортнее.');
    }

    // Активности
    if (temp > 15 && !condition.includes('дождь')) {
      if (condition.includes('ясно') || condition.includes('солнце')) {
        recommendations.push('🌳 Хороший день для прогулок на свежем воздухе.');
      }
    }

    if (temp < 0 || condition.includes('дождь') || condition.includes('снег')) {
      recommendations.push('🏠 Планируйте больше времени проводить в помещении.');
    }

    return recommendations.join('\n');
  } catch (error) {
    logger('[WeatherService] error generating detailed recommendation:', error);
    return '🧥 Одевайтесь по погоде.';
  }
}

/**
 * Получить интерполированный почасовой прогноз (шаг 1 час)
 */
export async function getInterpolatedHourlyForecast(
  coords: Coordinates,
  cityName: string,
  targetDate: string, // 'today' или 'YYYY-MM-DD'
  locationId?: number,
  countryCode: string = 'RU',
  timezone: string = 'Europe/Moscow'
): Promise<{ data: HourlyForecastData[] | null; source: string; error?: string }> {
  const cacheKey = locationId
    ? `hourly_interpolated:${locationId}:${targetDate}`
    : `hourly_interpolated:${coords.latitude},${coords.longitude}:${targetDate}`;

  // Проверяем кэш
  const cached = weatherCache.get<HourlyForecastData[]>(cacheKey);
  if (cached) {
    logger(`[WeatherService] cache hit for interpolated hourly forecast ${targetDate}`);
    return { data: cached, source: 'cache' };
  }

  logger(`[WeatherService] cache miss for interpolated hourly forecast ${targetDate}`);

  try {
    // Получаем базовый почасовой прогноз (шаг 3 часа)
    const baseHourlyResult = await getHourlyForecast(
      coords,
      cityName,
      targetDate,
      locationId,
      countryCode,
      timezone
    );

    if (!baseHourlyResult.data || baseHourlyResult.data.length === 0) {
      return { data: null, source: baseHourlyResult.source, error: baseHourlyResult.error };
    }

    // Интерполируем до шага 1 час
    const interpolated = interpolateHourlyData(baseHourlyResult.data);

    // Сохраняем в кэш
    weatherCache.set(cacheKey, interpolated, FORECAST_CACHE_TTL_SECONDS * 2);

    return { data: interpolated, source: baseHourlyResult.source };
  } catch (error) {
    logger('[WeatherService] error getting interpolated hourly forecast:', error);
    return { data: null, source: 'api_error', error: 'network_error' };
  }
}

/**
 * Интерполировать данные с шага 3 часа до шага 1 час
 */
function interpolateHourlyData(baseData: HourlyForecastData[]): HourlyForecastData[] {
  try {
    if (baseData.length < 2) {
      return baseData;
    }

    const interpolated: HourlyForecastData[] = [];

    for (let i = 0; i < baseData.length - 1; i++) {
      const current = baseData[i];
      const next = baseData[i + 1];

      // Добавляем текущий час
      interpolated.push({ ...current });

      // Интерполируем промежуточные часы
      const currentHour = current.hour;
      const nextHour = next.hour;

      // Если разница больше 1 часа, интерполируем
      if (nextHour > currentHour + 1) {
        for (let hour = currentHour + 1; hour < nextHour; hour++) {
          // Линейная интерполяция
          const ratio = (hour - currentHour) / (nextHour - currentHour);

          const interpolatedHour: HourlyForecastData = {
            time: `${hour.toString().padStart(2, '0')}:00`,
            hour: hour,
            temp: current.temp + (next.temp - current.temp) * ratio,
            feelsLike: current.feelsLike + (next.feelsLike - current.feelsLike) * ratio,
            condition: ratio < 0.5 ? current.condition : next.condition,
            humidity: Math.round(current.humidity + (next.humidity - current.humidity) * ratio),
            pressure: current.pressure
              ? current.pressure + (next.pressure! - current.pressure) * ratio
              : undefined,
            windSpeed: current.windSpeed + (next.windSpeed - current.windSpeed) * ratio,
            windDeg: Math.round(current.windDeg + (next.windDeg - current.windDeg) * ratio)
          };

          interpolated.push(interpolatedHour);
        }
      }
    }

    // Добавляем последний элемент
    interpolated.push({ ...baseData[baseData.length - 1] });

    // Убедимся, что у нас 24 часа
    if (interpolated.length < 24) {
      // Дублируем последние значения
      const lastHour = interpolated[interpolated.length - 1];
      const lastHourValue = lastHour.hour;

      for (let hour = lastHourValue + 1; hour < 24; hour++) {
        interpolated.push({
          time: `${hour.toString().padStart(2, '0')}:00`,
          hour: hour,
          temp: lastHour.temp,
          feelsLike: lastHour.feelsLike,
          condition: lastHour.condition,
          humidity: lastHour.humidity,
          pressure: lastHour.pressure,
          windSpeed: lastHour.windSpeed,
          windDeg: lastHour.windDeg
        });
      }
    }

    // Обрезаем до 24 часов
    return interpolated.slice(0, 24);
  } catch (error) {
    logger('[WeatherService] error interpolating hourly data:', error);
    return baseData;
  }
}

/**
 * Получить статистику кэша
 */
export function getWeatherCacheStats() {
  return weatherCache.getStats();
}

