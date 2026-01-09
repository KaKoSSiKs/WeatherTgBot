/**
 * Weather API Routes
 * 
 * REST API endpoints для получения погоды
 */

import { Router, Request, Response } from 'express';
import { WeatherService } from '../../services/weather/weather.service';
import { OpenWeatherProvider } from '../../integrations/weather';
import { appConfig } from '../../config';
import { logger } from '../../shared/utils/logger';

const router = Router();

// Создаем WeatherService (можно вынести в DI контейнер)
const apiKey = appConfig.WEATHER_API_KEY || appConfig.OPENWEATHER_API_KEY || '';
if (!apiKey) {
  logger.warn('Weather API key not configured');
}
const weatherProvider = new OpenWeatherProvider(apiKey);
const weatherService = new WeatherService(weatherProvider);

/**
 * GET /api/weather/current - текущая погода
 * Query params: locationId (optional)
 */
router.get('/current', async (req: Request, res: Response) => {
  try {
    const telegramId = req.user!.telegramId;
    const locationId = req.query.locationId ? parseInt(String(req.query.locationId)) : undefined;
    
    const result = await weatherService.getCurrentWeatherForUser(telegramId, locationId);
    
    res.json({
      place: {
        id: String(result.location.id),
        name: result.location.name,
        lat: result.location.coordinates.latitude,
        lon: result.location.coordinates.longitude,
        country: result.location.countryCode
      },
      now: {
        temp: result.weather.temperature,
        feels: result.weather.feelsLike,
        condition: result.weather.description,
        wind: result.weather.windSpeed,
        humidity: result.weather.humidity,
        pressure: result.weather.pressure,
        uvi: result.weather.uvIndex || 0,
        sunrise: result.weather.sunrise ? new Date(result.weather.sunrise).toTimeString().slice(0, 5) : undefined,
        sunset: result.weather.sunset ? new Date(result.weather.sunset).toTimeString().slice(0, 5) : undefined
      }
    });
  } catch (error) {
    logger.error('Error fetching current weather:', error);
    throw error;
  }
});

/**
 * GET /api/weather/forecast - прогноз погоды
 * Query params: locationId (optional), days (default: 5)
 */
router.get('/forecast', async (req: Request, res: Response) => {
  try {
    const telegramId = req.user!.telegramId;
    const locationId = req.query.locationId ? parseInt(String(req.query.locationId)) : undefined;
    const days = req.query.days ? parseInt(String(req.query.days)) : 5;
    
    const result = await weatherService.getForecastForUser(telegramId, days, locationId);
    
    // Преобразуем формат для мини-аппа
    const hours = result.forecast.hourly?.slice(0, 24).map((h, idx) => ({
      h: idx,
      temp: h.temperature,
      icon: getWeatherIcon(h.condition),
      wind: h.windSpeed
    })) || [];
    
    const daysForecast = result.forecast.daily?.map((d, idx) => ({
      date: d.date.toISOString().slice(0, 10),
      min: d.temperatureMin,
      max: d.temperatureMax,
      icon: getWeatherIcon(d.condition),
      rainChance: d.precipitationChance || 0
    })) || [];
    
    res.json({
      place: {
        id: String(result.location.id),
        name: result.location.name,
        lat: result.location.coordinates.latitude,
        lon: result.location.coordinates.longitude,
        country: result.location.countryCode
      },
      hours,
      days: daysForecast
    });
  } catch (error) {
    logger.error('Error fetching forecast:', error);
    throw error;
  }
});

/**
 * Преобразует условие погоды в эмодзи
 */
function getWeatherIcon(condition?: string): string {
  if (!condition) return '🌤️';
  const lower = condition.toLowerCase();
  if (lower.includes('clear') || lower.includes('sun')) return '☀️';
  if (lower.includes('cloud')) return '☁️';
  if (lower.includes('rain')) return '🌧️';
  if (lower.includes('snow')) return '❄️';
  if (lower.includes('storm') || lower.includes('thunder')) return '⛈️';
  if (lower.includes('fog') || lower.includes('mist')) return '🌫️';
  return '🌤️';
}

export function registerWeatherRoutes(apiRouter: Router): void {
  apiRouter.use('/weather', router);
}
