/**
 * Weather Service
 * 
 * Единственная точка доступа к погоде для Telegram-бота и Mini App.
 * Агрегирует данные из repositories и WeatherProvider.
 * Не знает про Telegram и HTTP.
 */

import {
  UserRepository,
  UserSettingsRepository,
  LocationRepository,
} from '../../storage/prisma/repositories';
import type { WeatherProvider } from '../../integrations/weather';
import type {
  CurrentWeather,
  WeatherForecast,
  Coordinates,
} from '../../shared/types/weather.types';
import {
  UserNotFoundError,
  LocationNotSetError,
} from '../../shared/errors/domain.errors';
import { logger } from '../../shared/utils/logger';

/**
 * Результат получения текущей погоды
 */
export interface CurrentWeatherResult {
  weather: CurrentWeather;
  location: {
    id: number;
    name: string;
    coordinates: Coordinates;
    countryCode?: string;
  };
}

/**
 * Результат получения прогноза
 */
export interface ForecastResult {
  forecast: WeatherForecast;
  location: {
    id: number;
    name: string;
    coordinates: Coordinates;
    countryCode?: string;
  };
}

/**
 * Weather Service
 */
export class WeatherService {
  constructor(
    private weatherProvider: WeatherProvider,
    private userRepo: UserRepository = new UserRepository(),
    private settingsRepo: UserSettingsRepository = new UserSettingsRepository(),
    private locationRepo: LocationRepository = new LocationRepository()
  ) {}

  /**
   * Получить текущую погоду для пользователя
   * 
   * @param userId - ID пользователя (telegram_id как string или внутренний id как number)
   * @param locationId - Опциональный ID локации (если не указан, используется дефолтная)
   * @returns Текущая погода с информацией о локации
   * @throws UserNotFoundError если пользователь не найден
   * @throws LocationNotSetError если дефолтная локация не установлена
   */
  async getCurrentWeatherForUser(
    userId: string | number,
    locationId?: number
  ): Promise<CurrentWeatherResult> {
    // Получаем пользователя
    const user = await this.getUser(userId);

    // Получаем локацию
    const location = await this.getLocationForUser(user.id, locationId);

    // Получаем погоду
    const weather = await this.weatherProvider.getCurrentWeather(
      {
        latitude: location.latitude,
        longitude: location.longitude,
      }
    );

    logger.debug(
      `WeatherService: Got current weather for user ${user.id}, location ${location.id}`
    );

    return {
      weather,
      location: {
        id: location.id,
        name: location.name,
        coordinates: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
        countryCode: location.countryCode || undefined,
      },
    };
  }

  /**
   * Получить прогноз погоды для пользователя
   * 
   * @param userId - ID пользователя (telegram_id как string или внутренний id как number)
   * @param days - Количество дней прогноза (по умолчанию 5)
   * @param locationId - Опциональный ID локации (если не указан, используется дефолтная)
   * @returns Прогноз погоды с информацией о локации
   * @throws UserNotFoundError если пользователь не найден
   * @throws LocationNotSetError если дефолтная локация не установлена
   */
  async getForecastForUser(
    userId: string | number,
    days: number = 5,
    locationId?: number
  ): Promise<ForecastResult> {
    // Получаем пользователя
    const user = await this.getUser(userId);

    // Получаем локацию
    const location = await this.getLocationForUser(user.id, locationId);

    // Получаем прогноз
    const forecast = await this.weatherProvider.getForecast(
      {
        latitude: location.latitude,
        longitude: location.longitude,
      },
      days
    );

    logger.debug(
      `WeatherService: Got forecast for user ${user.id}, location ${location.id}, ${days} days`
    );

    return {
      forecast,
      location: {
        id: location.id,
        name: location.name,
        coordinates: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
        countryCode: location.countryCode || undefined,
      },
    };
  }

  /**
   * Получить пользователя по ID или telegram_id
   */
  private async getUser(userId: string | number) {
    let user;

    if (typeof userId === 'string') {
      // Если строка, ищем по telegram_id
      user = await this.userRepo.findByTelegramId(userId);
    } else {
      // Если число, ищем по внутреннему id
      user = await this.userRepo.findById(userId);
    }

    if (!user) {
      throw new UserNotFoundError(userId);
    }

    return user;
  }

  /**
   * Получить локацию для пользователя
   * 
   * @param userId - Внутренний ID пользователя
   * @param locationId - Опциональный ID локации
   * @returns Локация пользователя
   * @throws LocationNotSetError если локация не найдена
   */
  private async getLocationForUser(
    userId: number,
    locationId?: number
  ) {
    let location;

    if (locationId) {
      // Если указан locationId, проверяем принадлежность
      location = await this.locationRepo.findByIdAndUserId(locationId, userId);
      if (!location) {
        throw new LocationNotSetError(userId);
      }
    } else {
      // Иначе используем дефолтную локацию из настроек
      const settings = await this.settingsRepo.findByUserId(userId);
      
      if (!settings || !settings.defaultLocationId) {
        throw new LocationNotSetError(userId);
      }

      location = await this.locationRepo.findById(settings.defaultLocationId);
      
      if (!location) {
        throw new LocationNotSetError(userId);
      }

      // Проверяем, что локация принадлежит пользователю
      if (location.userId !== userId) {
        throw new LocationNotSetError(userId);
      }
    }

    return location;
  }
}

