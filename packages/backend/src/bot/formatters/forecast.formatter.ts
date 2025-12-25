/**
 * Forecast Formatter
 * 
 * Форматирует прогноз погоды в текст для Telegram.
 */

import type { ForecastResult } from '../../services/weather';

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
  
  return '🌤️';
}

/**
 * Форматировать название дня недели
 */
function formatDayName(date: Date): string {
  const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  return days[date.getDay()];
}

/**
 * Форматировать дату
 */
function formatDate(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const forecastDate = new Date(date);
  forecastDate.setHours(0, 0, 0, 0);
  
  const diffTime = forecastDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'Сегодня';
  }
  if (diffDays === 1) {
    return 'Завтра';
  }
  
  return formatDayName(date);
}

/**
 * Форматировать прогноз в текст
 */
export function formatForecast(result: ForecastResult): string {
  const { forecast, location } = result;
  const days = forecast.daily || [];
  
  const lines: string[] = [];
  
  // Заголовок
  lines.push(`📅 Прогноз на ${days.length} ${days.length === 1 ? 'день' : 'дней'} — ${location.name}`);
  if (location.countryCode) {
    lines[0] += ` (${location.countryCode})`;
  }
  lines.push('');
  
  // Прогноз по дням
  days.forEach((day) => {
    const emoji = getWeatherEmoji(day.condition);
    const dayName = formatDate(day.date);
    const minTemp = Math.round(day.temperature.min);
    const maxTemp = Math.round(day.temperature.max);
    
    let dayLine = `${dayName}: ${emoji} ${minTemp}° / ${maxTemp}°`;
    
    // Добавляем вероятность осадков, если есть
    if (day.precipitation?.probability && day.precipitation.probability > 0) {
      const probPercent = Math.round(day.precipitation.probability * 100);
      dayLine += ` (${probPercent}% осадков)`;
    }
    
    lines.push(dayLine);
  });
  
  return lines.join('\n');
}

