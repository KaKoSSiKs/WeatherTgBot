/**
 * Geocoding Utilities
 * 
 * Утилиты для геокодинга городов.
 */

export interface GeocodedLocation {
  name: string;
  latitude: number;
  longitude: number;
  countryCode?: string;
}

/**
 * Дефолтный город (Москва)
 */
export const DEFAULT_CITY: GeocodedLocation = {
  name: 'Москва',
  latitude: 55.7558,
  longitude: 37.6173,
  countryCode: 'RU',
};

/**
 * Список популярных городов
 */
const POPULAR_CITIES: Record<string, GeocodedLocation> = {
  'москва': { name: 'Москва', latitude: 55.7558, longitude: 37.6173, countryCode: 'RU' },
  'санкт-петербург': { name: 'Санкт-Петербург', latitude: 59.9343, longitude: 30.3351, countryCode: 'RU' },
  'новосибирск': { name: 'Новосибирск', latitude: 55.0084, longitude: 82.9357, countryCode: 'RU' },
  'екатеринбург': { name: 'Екатеринбург', latitude: 56.8431, longitude: 60.6454, countryCode: 'RU' },
  'казань': { name: 'Казань', latitude: 55.8304, longitude: 49.0661, countryCode: 'RU' },
  'нижний новгород': { name: 'Нижний Новгород', latitude: 56.2965, longitude: 43.9361, countryCode: 'RU' },
  'челябинск': { name: 'Челябинск', latitude: 55.1644, longitude: 61.4368, countryCode: 'RU' },
  'самара': { name: 'Самара', latitude: 53.2001, longitude: 50.15, countryCode: 'RU' },
  'омск': { name: 'Омск', latitude: 54.9885, longitude: 73.3242, countryCode: 'RU' },
  'ростов-на-дону': { name: 'Ростов-на-Дону', latitude: 47.2357, longitude: 39.7015, countryCode: 'RU' },
  'уфа': { name: 'Уфа', latitude: 54.7431, longitude: 55.9678, countryCode: 'RU' },
  'красноярск': { name: 'Красноярск', latitude: 56.0184, longitude: 92.8672, countryCode: 'RU' },
  'воронеж': { name: 'Воронеж', latitude: 51.672, longitude: 39.1843, countryCode: 'RU' },
  'пермь': { name: 'Пермь', latitude: 58.0105, longitude: 56.2502, countryCode: 'RU' },
  'волгоград': { name: 'Волгоград', latitude: 48.7194, longitude: 44.5018, countryCode: 'RU' },
};

/**
 * Геокодинг города по названию
 */
export function geocodeCity(cityName: string): GeocodedLocation | null {
  if (!cityName) {
    return null;
  }

  const normalized = cityName.toLowerCase().trim();
  
  // Проверяем популярные города
  const city = POPULAR_CITIES[normalized];
  if (city) {
    return city;
  }

  // TODO: Интеграция с внешним API геокодинга (например, OpenWeatherMap Geocoding API)
  // Пока возвращаем null для неизвестных городов
  return null;
}

/**
 * Получить список популярных городов
 */
export function getPopularCities(): GeocodedLocation[] {
  return Object.values(POPULAR_CITIES);
}

