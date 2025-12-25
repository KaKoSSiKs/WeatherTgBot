/**
 * Weather Provider Interface
 * 
 * Абстракция над различными провайдерами погоды.
 * Позволяет переключаться между разными источниками данных.
 */

import type { CurrentWeather, WeatherForecast, Coordinates } from '../../shared/types/weather.types';

/**
 * Интерфейс провайдера погоды
 */
export interface WeatherProvider {
  /**
   * Получить текущую погоду по координатам
   * 
   * @param coordinates - Координаты местоположения
   * @returns Текущая погода
   * @throws WeatherError при ошибках API
   */
  getCurrentWeather(coordinates: Coordinates): Promise<CurrentWeather>;

  /**
   * Получить прогноз погоды по координатам
   * 
   * @param coordinates - Координаты местоположения
   * @param days - Количество дней прогноза (опционально)
   * @returns Прогноз погоды
   * @throws WeatherError при ошибках API
   */
  getForecast(coordinates: Coordinates, days?: number): Promise<WeatherForecast>;
}
