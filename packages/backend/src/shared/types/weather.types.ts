/**
 * Weather Types
 * 
 * Нормализованные типы для работы с погодой.
 * Backend-ориентированные, не зависят от конкретного провайдера.
 */

/**
 * Координаты местоположения
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Текущая погода
 */
export interface CurrentWeather {
  temperature: number;        // Температура (°C или °F)
  feelsLike: number;          // Ощущается как
  humidity: number;            // Влажность (%)
  pressure: number;            // Давление (гПа)
  windSpeed: number;           // Скорость ветра (м/с, км/ч или миль/ч)
  windDirection?: number;      // Направление ветра (градусы, 0-360)
  visibility?: number;         // Видимость (метры)
  cloudiness?: number;         // Облачность (%)
  uvIndex?: number;            // UV индекс
  condition: string;            // Условия (например, "ясно", "облачно")
  description: string;          // Описание (например, "ясное небо")
  icon: string;                // Иконка (например, "01d")
  timestamp: Date;              // Время получения данных
}

/**
 * Прогноз на один день
 */
export interface DailyForecast {
  date: Date;                   // Дата прогноза
  temperature: {
    min: number;                 // Минимальная температура
    max: number;                 // Максимальная температура
    day: number;                 // Дневная температура
    night: number;               // Ночная температура
    morning?: number;            // Утренняя температура
    evening?: number;            // Вечерняя температура
  };
  feelsLike: {
    day: number;
    night: number;
  };
  condition: string;             // Условия
  description: string;           // Описание
  icon: string;                 // Иконка
  humidity: number;             // Влажность (%)
  pressure: number;             // Давление (гПа)
  windSpeed: number;            // Скорость ветра
  windDirection?: number;        // Направление ветра
  cloudiness?: number;          // Облачность (%)
  precipitation?: {
    probability: number;         // Вероятность осадков (0-1)
    amount?: number;             // Количество осадков (мм)
  };
  sunrise?: Date;               // Время восхода
  sunset?: Date;                 // Время заката
}

/**
 * Почасовой прогноз
 */
export interface HourlyForecast {
  time: Date;                   // Время прогноза
  temperature: number;           // Температура
  feelsLike: number;            // Ощущается как
  condition: string;             // Условия
  description: string;           // Описание
  icon: string;                 // Иконка
  humidity: number;             // Влажность (%)
  pressure: number;             // Давление (гПа)
  windSpeed: number;            // Скорость ветра
  windDirection?: number;        // Направление ветра
  cloudiness?: number;          // Облачность (%)
  precipitation?: {
    probability: number;         // Вероятность осадков (0-1)
    amount?: number;             // Количество осадков (мм)
  };
  visibility?: number;          // Видимость (метры)
}

/**
 * Полный прогноз погоды
 */
export interface WeatherForecast {
  location: {
    name: string;                // Название локации
    coordinates: Coordinates;    // Координаты
    countryCode?: string;        // Код страны
  };
  current?: CurrentWeather;      // Текущая погода
  daily?: DailyForecast[];       // Ежедневный прогноз
  hourly?: HourlyForecast[];     // Почасовой прогноз
  fetchedAt: Date;               // Время получения данных
}

/**
 * Ошибка получения погоды
 */
export class WeatherError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'WeatherError';
  }
}

/**
 * Коды ошибок
 */
export enum WeatherErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  INVALID_API_KEY = 'INVALID_API_KEY',
  RATE_LIMIT = 'RATE_LIMIT',
  NOT_FOUND = 'NOT_FOUND',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}
