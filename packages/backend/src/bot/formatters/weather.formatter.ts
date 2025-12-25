/**
 * Weather Formatter
 * 
 * Форматирует данные о погоде в текст для Telegram.
 * Тексты и форматирование перенесены из старого бота (bot/).
 */

import type { CurrentWeatherResult } from '../../services/weather';

/**
 * Получить эмодзи для условия погоды
 */
function getWeatherEmoji(condition: string): string {
  const conditionLower = condition.toLowerCase();
  
  if (conditionLower.includes('clear') || conditionLower.includes('ясно')) {
    return '☀️';
  }
  if (conditionLower.includes('cloud') || conditionLower.includes('облачн')) {
    return '☁️';
  }
  if (conditionLower.includes('rain') || conditionLower.includes('дождь')) {
    return '🌧️';
  }
  if (conditionLower.includes('snow') || conditionLower.includes('снег')) {
    return '❄️';
  }
  if (conditionLower.includes('thunderstorm') || conditionLower.includes('гроза')) {
    return '⛈️';
  }
  if (conditionLower.includes('drizzle') || conditionLower.includes('морось')) {
    return '🌦️';
  }
  if (conditionLower.includes('mist') || conditionLower.includes('fog') || conditionLower.includes('туман')) {
    return '🌫️';
  }
  if (conditionLower.includes('wind') || conditionLower.includes('ветер')) {
    return '💨';
  }
  if (conditionLower.includes('extreme') || conditionLower.includes('экстремальн')) {
    return '⚠️';
  }
  
  return '🌤️';
}

/**
 * Преобразовать градусы в направление ветра
 */
function getWindDirection(degrees: number): string {
  const directions: Record<string, string> = {
    'N': 'С',
    'NNE': 'ССВ',
    'NE': 'СВ',
    'ENE': 'ВСВ',
    'E': 'В',
    'ESE': 'ВЮВ',
    'SE': 'ЮВ',
    'SSE': 'ЮЮВ',
    'S': 'Ю',
    'SSW': 'ЮЮЗ',
    'SW': 'ЮЗ',
    'WSW': 'ЗЮЗ',
    'W': 'З',
    'WNW': 'ЗСЗ',
    'NW': 'СЗ',
    'NNW': 'ССЗ'
  };
  
  const directionNames = Object.keys(directions);
  const index = Math.round(degrees / (360.0 / directionNames.length)) % directionNames.length;
  const direction = directionNames[index];
  return directions[direction] || direction;
}

/**
 * Получить рекомендацию по одежде на основе температуры
 */
function getTemperatureRecommendation(temp: number, feelsLike: number): string {
  const tempForRecommendation = feelsLike || temp;
  
  if (tempForRecommendation < -15) {
    return '🧥 Очень холодно - наденьте теплую зимнюю одежду, шапку и перчатки.';
  } else if (tempForRecommendation < -5) {
    return '🧥 Холодно - наденьте зимнюю куртку или пальто.';
  } else if (tempForRecommendation < 5) {
    return '🧥 Прохладно - наденьте куртку или пальто.';
  } else if (tempForRecommendation < 15) {
    return '👕 Умеренно - легкая куртка или свитер будут комфортны.';
  } else if (tempForRecommendation < 25) {
    return '👕 Тепло - футболка или рубашка с длинным рукавом.';
  } else if (tempForRecommendation < 30) {
    return '🥵 Жарко - легкая одежда, головной убор от солнца.';
  } else {
    return '🥵 Очень жарко - минимум одежды, обязательно головной убор.';
  }
}

/**
 * Форматировать текущую погоду в текст (как в старом боте)
 */
export function formatCurrentWeather(result: CurrentWeatherResult): string {
  const { weather, location } = result;
  const emoji = getWeatherEmoji(weather.condition);
  
  // Получаем текущее время
  const now = new Date();
  const timeStr = now.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const lines: string[] = [];
  
  // Заголовок (как в старом боте: "🌍 Город, Код | Время")
  lines.push(`🌍 ${location.name}${location.countryCode ? `, ${location.countryCode}` : ''} | ${timeStr}`);
  lines.push('');
  
  // Условие с эмодзи
  lines.push(`${emoji} ${weather.condition}`);
  lines.push('');
  
  // Температура
  lines.push(`🌡 Температура: ${weather.temperature.toFixed(1)}°C`);
  
  // Ощущается как
  if (weather.feelsLike !== weather.temperature) {
    lines.push(`🤚 Ощущается как: ${weather.feelsLike.toFixed(1)}°C`);
  }
  
  // Влажность
  lines.push(`💧 Влажность: ${weather.humidity}%`);
  
  // Давление
  lines.push(`📊 Давление: ${weather.pressure} гПа`);
  
  // Видимость
  if (weather.visibility !== undefined) {
    const visibilityKm = (weather.visibility / 1000).toFixed(1);
    lines.push(`👁 Видимость: ${visibilityKm} км`);
  }
  
  // Ветер
  if (weather.windSpeed > 0) {
    const windDirection = weather.windDirection !== undefined 
      ? getWindDirection(weather.windDirection)
      : '';
    lines.push(`💨 Ветер: ${weather.windSpeed.toFixed(1)} м/с${windDirection ? `, ${windDirection}` : ''}`);
  }
  
  // Рекомендации по одежде
  const recommendation = getTemperatureRecommendation(weather.temperature, weather.feelsLike);
  lines.push('');
  lines.push('💡 Рекомендации:');
  lines.push(recommendation);
  
  return lines.join('\n');
}

/**
 * Форматировать сообщение об ошибке получения погоды (тексты из старого бота)
 */
export function formatWeatherError(cityName: string, errorType: string = 'api_error'): string {
  if (errorType === 'city_not_found') {
    return `Город '${cityName}' не найден.\nПроверьте правильность написания.`;
  } else if (errorType === 'no_cities') {
    return 'У вас нет сохраненных городов.\n\nДобавьте город, чтобы получать погоду:';
  } else if (errorType === 'invalid_api_key') {
    return '⚠️ Ошибка конфигурации сервиса погоды.\n\nПожалуйста, обратитесь к администратору бота.';
  } else if (errorType === 'network_error') {
    return '⚠️ Проблемы с подключением к сервису погоды.\nПожалуйста, попробуйте позже.';
  } else if (errorType === 'api_error') {
    return '⚠️ Сервис погоды временно недоступен.\nПожалуйста, попробуйте позже.';
  } else {
    return 'Произошла неизвестная ошибка.\nПожалуйста, попробуйте еще раз.';
  }
}

