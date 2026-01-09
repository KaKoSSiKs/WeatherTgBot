/**
 * Weather Formatter
 * 
 * Форматирует данные о погоде в текст для Telegram.
 */

import type { CurrentWeatherResult } from '../../services/weather';

/**
 * Получить эмодзи для условия погоды
 */
function getWeatherEmoji(condition: string): string {
  const conditionLower = condition.toLowerCase();
  
  if (conditionLower.includes('clear') || conditionLower.includes('ясн')) {
    return '☀️';
  }
  if (conditionLower.includes('cloud') || conditionLower.includes('облач')) {
    return '☁️';
  }
  if (conditionLower.includes('rain') || conditionLower.includes('дожд')) {
    return '🌧️';
  }
  if (conditionLower.includes('snow') || conditionLower.includes('снег')) {
    return '❄️';
  }
  if (conditionLower.includes('thunder') || conditionLower.includes('гроза')) {
    return '⛈️';
  }
  if (conditionLower.includes('fog') || conditionLower.includes('туман')) {
    return '🌫️';
  }
  
  return '🌤️';
}

/**
 * Форматировать текущую погоду в текст
 */
export function formatCurrentWeather(result: CurrentWeatherResult): string {
  const { weather, location } = result;
  const emoji = getWeatherEmoji(weather.condition);
  
  const lines: string[] = [];
  
  // Заголовок
  lines.push(`${emoji} Погода в ${location.name}`);
  if (location.countryCode) {
    lines[0] += ` (${location.countryCode})`;
  }
  lines.push('');
  
  // Температура
  lines.push(`🌡 Температура: ${Math.round(weather.temperature)}°C`);
  if (weather.feelsLike !== weather.temperature) {
    lines[lines.length - 1] += ` (ощущается как ${Math.round(weather.feelsLike)}°C)`;
  }
  
  // Ветер
  if (weather.windSpeed > 0) {
    let windInfo = `💨 Ветер: ${weather.windSpeed.toFixed(1)} м/с`;
    if (weather.windDirection !== undefined) {
      const directions = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];
      const directionIndex = Math.round(weather.windDirection / 45) % 8;
      windInfo += ` ${directions[directionIndex]}`;
    }
    lines.push(windInfo);
  }
  
  // Влажность
  lines.push(`💧 Влажность: ${weather.humidity}%`);
  
  // Давление
  lines.push(`📊 Давление: ${weather.pressure} гПа`);
  
  // Облачность
  if (weather.cloudiness !== undefined) {
    lines.push(`☁ Облачность: ${weather.cloudiness}%`);
  }
  
  // Видимость
  if (weather.visibility !== undefined) {
    const visibilityKm = (weather.visibility / 1000).toFixed(1);
    lines.push(`👁 Видимость: ${visibilityKm} км`);
  }
  
  // Описание
  if (weather.description) {
    lines.push('');
    lines.push(`📝 ${weather.description}`);
  }
  
  return lines.join('\n');
}

