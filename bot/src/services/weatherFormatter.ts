/**
 * Сервис для форматирования погодных данных в текстовые сообщения.
 * Обновленный формат с эмодзи и структурированным выводом.
 */

import { DateTime } from 'luxon';

export interface WeatherData {
  condition: string;
  temp: number;
  feelsLike: number;
  humidity: number;
  pressure: number; // в гПа
  visibility: number; // в метрах
  windSpeed: number; // в м/с
  windDeg: number; // в градусах (0-360)
  sunrise?: number; // timestamp
  sunset?: number; // timestamp
  timezone?: string;
  cityName?: string;
  country?: string;
  warning?: string;
}

/**
 * Словарь эмодзи для погодных условий
 */
const WEATHER_EMOJIS: Record<string, string> = {
  clear: '☀️',
  clouds: '☁️',
  rain: '🌧️',
  snow: '❄️',
  thunderstorm: '⛈️',
  drizzle: '🌦️',
  mist: '🌫️',
  fog: '🌁',
  wind: '💨',
  extreme: '⚠️'
};

/**
 * Словарь направлений ветра
 */
const WIND_DIRECTIONS: Record<string, string> = {
  N: '↓ Север',
  NNE: 'Северо-северо-восток',
  NE: '↘ Северо-восток',
  ENE: 'Восточно-северо-восток',
  E: '→ Восток',
  ESE: 'Восточно-юго-восток',
  SE: '↘ Юго-восток',
  SSE: 'Юго-юго-восток',
  S: '↑ Юг',
  SSW: 'Юго-юго-запад',
  SW: '↖ Юго-запад',
  WSW: 'Западно-юго-запад',
  W: '← Запад',
  WNW: 'Западно-северо-запад',
  NW: '↖ Северо-запад',
  NNW: 'Северо-северо-запад'
};

/**
 * Словарь рекомендаций по одежде
 */
const CLOTHING_RECOMMENDATIONS: Record<string, string> = {
  very_cold: '🧥 Очень холодно - наденьте теплую зимнюю одежду, шапку и перчатки.',
  cold: '🧥 Холодно - наденьте зимнюю куртку или пальто.',
  cool: '🧥 Прохладно - наденьте куртку или пальто.',
  mild: '👕 Умеренно - легкая куртка или свитер будут комфортны.',
  warm: '👕 Тепло - футболка или рубашка с длинным рукавом.',
  hot: '🥵 Жарко - легкая одежда, головной убор от солнца.',
  very_hot: '🥵 Очень жарко - минимум одежды, обязательно головной убор.'
};

/**
 * Преобразовать градусы в направление ветра
 */
function getWindDirection(degrees: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 
                     'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / (360.0 / directions.length)) % directions.length;
  return WIND_DIRECTIONS[directions[index]] || directions[index];
}

/**
 * Получить рекомендацию по одежде на основе температуры
 */
function getTemperatureRecommendation(temp: number, feelsLike: number): string {
  // Используем ощущаемую температуру для рекомендаций
  const tempForRecommendation = feelsLike || temp;
  
  if (tempForRecommendation < -15) {
    return CLOTHING_RECOMMENDATIONS.very_cold;
  } else if (tempForRecommendation < -5) {
    return CLOTHING_RECOMMENDATIONS.cold;
  } else if (tempForRecommendation < 5) {
    return CLOTHING_RECOMMENDATIONS.cool;
  } else if (tempForRecommendation < 15) {
    return CLOTHING_RECOMMENDATIONS.mild;
  } else if (tempForRecommendation < 25) {
    return CLOTHING_RECOMMENDATIONS.warm;
  } else if (tempForRecommendation < 30) {
    return CLOTHING_RECOMMENDATIONS.hot;
  } else {
    return CLOTHING_RECOMMENDATIONS.very_hot;
  }
}

/**
 * Получить эмодзи для погодного условия
 */
function getWeatherEmoji(condition: string): string {
  const conditionLower = condition.toLowerCase();
  
  if (conditionLower.includes('clear') || conditionLower.includes('ясно')) {
    return '☀️';
  } else if (conditionLower.includes('cloud') || conditionLower.includes('облачн')) {
    return '☁️';
  } else if (conditionLower.includes('rain') || conditionLower.includes('дождь')) {
    return '🌧️';
  } else if (conditionLower.includes('snow') || conditionLower.includes('снег')) {
    return '❄️';
  } else if (conditionLower.includes('thunderstorm') || conditionLower.includes('гроза')) {
    return '⛈️';
  } else if (conditionLower.includes('drizzle') || conditionLower.includes('морось')) {
    return '🌦️';
  } else if (conditionLower.includes('mist') || conditionLower.includes('fog') || 
             conditionLower.includes('туман')) {
    return '🌫️';
  } else if (conditionLower.includes('wind') || conditionLower.includes('ветер')) {
    return '💨';
  } else if (conditionLower.includes('extreme') || conditionLower.includes('экстремальн')) {
    return '⚠️';
  } else {
    return '🌤️';
  }
}

/**
 * Отформатировать данные о текущей погоде в сообщение
 */
export function formatCurrentWeather(
  weatherData: WeatherData,
  cityName: string,
  countryCode: string = 'RU',
  timezone: string = 'Europe/Moscow',
  includeRecommendations: boolean = true,
  includeWarnings: boolean = true
): string {
  try {
    // Получаем текущее время в часовом поясе города
    const tz = timezone || 'Europe/Moscow';
    const currentTime = DateTime.now().setZone(tz);
    const timeStr = currentTime.toFormat('dd.MM.yyyy HH:mm');
    
    // Основная информация
    const condition = weatherData.condition || 'Неизвестно';
    const conditionEmoji = getWeatherEmoji(condition);
    
    // Температура
    const temp = weatherData.temp || 0;
    const feelsLike = weatherData.feelsLike || temp;
    
    // Ветер
    const windSpeed = weatherData.windSpeed || 0;
    const windDeg = weatherData.windDeg || 0;
    const windDirection = getWindDirection(windDeg);
    
    // Дополнительные параметры
    const humidity = weatherData.humidity || 0;
    const pressure = weatherData.pressure || 0; // в гПа
    const visibility = (weatherData.visibility || 0) / 1000; // переводим в км
    
    // Время восхода и заката
    let sunriseTime = 'Неизвестно';
    let sunsetTime = 'Неизвестно';
    
    if (weatherData.sunrise) {
      const sunrise = DateTime.fromSeconds(weatherData.sunrise).setZone(tz);
      sunriseTime = sunrise.toFormat('HH:mm');
    }
    
    if (weatherData.sunset) {
      const sunset = DateTime.fromSeconds(weatherData.sunset).setZone(tz);
      sunsetTime = sunset.toFormat('HH:mm');
    }
    
    // Рекомендации
    let recommendation = '';
    if (includeRecommendations) {
      recommendation = getTemperatureRecommendation(temp, feelsLike);
    }
    
    // Предупреждения
    const warning = weatherData.warning || '';
    
    // Формируем сообщение
    let message = `🌍 ${cityName}, ${countryCode} | ${timeStr}\n\n`;
    message += `${conditionEmoji} ${condition}\n\n`;
    message += `🌡 Температура: ${temp.toFixed(1)}°C\n`;
    message += `🤚 Ощущается как: ${feelsLike.toFixed(1)}°C\n`;
    message += `💧 Влажность: ${humidity}%\n`;
    message += `📊 Давление: ${pressure} гПа\n`;
    message += `👁 Видимость: ${visibility.toFixed(1)} км\n`;
    message += `💨 Ветер: ${windSpeed.toFixed(1)} м/с, ${windDirection}\n\n`;
    message += `🌅 Восход: ${sunriseTime}\n`;
    message += `🌇 Закат: ${sunsetTime}`;
    
    // Добавляем рекомендации, если нужно
    if (includeRecommendations && recommendation) {
      message += `\n\n💡 Рекомендации:\n${recommendation}`;
    }
    
    // Добавляем предупреждения, если нужно
    if (includeWarnings && warning) {
      message += `\n\n⚠️ Предупреждение МЧС: ${warning}`;
    }
    
    return message;
    
  } catch (error) {
    // В случае ошибки возвращаем простое сообщение
    return `🌍 ${cityName}, ${countryCode}\n\n⚠️ Не удалось получить детальные данные о погоде.\n\nПожалуйста, попробуйте обновить данные через несколько минут.`;
  }
}

/**
 * Форматировать сообщение об ошибке получения погоды
 */
export function formatWeatherError(cityName: string, errorType: string = 'api_error'): string {
  if (errorType === 'city_not_found') {
    return `Город '${cityName}' не найден.\nПроверьте правильность написания.`;
  } else if (errorType === 'no_cities') {
    return 'У вас нет сохраненных городов.\n\nДобавьте город, чтобы получать погоду:';
  } else if (errorType === 'api_error') {
    return '⚠️ Сервис погоды временно недоступен.\nПожалуйста, попробуйте позже.';
  } else {
    return 'Произошла неизвестная ошибка.\nПожалуйста, попробуйте еще раз.';
  }
}

/**
 * Типы данных для прогнозов
 */
import type { DailyForecastData, HourlyForecastData } from './weatherService';

/**
 * Отформатировать ежедневный прогноз (краткий формат)
 */
export function formatDailyForecast(
  forecastData: DailyForecastData,
  cityName: string,
  countryCode: string = 'RU',
  includeRecommendations: boolean = true,
  includeWarnings: boolean = true
): string {
  try {
    const dateStr = forecastData.dateStr || '';
    const condition = forecastData.condition || 'Неизвестно';
    const conditionEmoji = getWeatherEmoji(condition);
    
    const temp = forecastData.temp || 0;
    const tempMin = forecastData.tempMin || temp;
    const tempMax = forecastData.tempMax || temp;
    
    const humidity = forecastData.humidity || 0;
    const windSpeed = forecastData.windSpeed || 0;
    const windDeg = forecastData.windDeg || 0;
    const windDirection = getWindDirection(windDeg);
    
    const feelsLike = forecastData.feelsLike || temp;
    
    let message = `🌍 ${cityName}, ${countryCode} | Прогноз на ${dateStr}\n\n`;
    message += `${conditionEmoji} ${condition}\n`;
    message += `🌡 Температура: ${temp.toFixed(1)}°C\n`;
    message += `🤚 Ощущается как: ${feelsLike.toFixed(1)}°C\n`;
    message += `💧 Влажность: ${humidity}%\n`;
    message += `💨 Ветер: ${windSpeed.toFixed(1)} м/с, ${windDirection}`;
    
    // Добавляем рекомендации, если нужно
    if (includeRecommendations) {
      const recommendation = getTemperatureRecommendation(temp, temp);
      message += `\n\n💡 Рекомендации:\n${recommendation}`;
    }
    
    // Добавляем предупреждения, если есть
    const warning = forecastData.warning || '';
    if (includeWarnings && warning) {
      message += `\n\n⚠️ ${warning}`;
    }
    
    return message;
  } catch (error) {
    return `Ошибка форматирования прогноза на ${forecastData.dateStr || 'дату'}`;
  }
}

/**
 * Отформатировать детальный прогноз на день (улучшенная версия по ТЗ)
 */
export function formatDetailedForecast(
  forecastData: DailyForecastData,
  cityName: string,
  countryCode: string = 'RU',
  timezone: string = 'Europe/Moscow',
  includeRecommendations: boolean = true,
  includeWarnings: boolean = true
): string {
  try {
    const dateStr = forecastData.dateStr || '';
    const condition = forecastData.condition || 'Неизвестно';
    const conditionEmoji = getWeatherEmoji(condition);
    
    const temp = forecastData.temp || 0;
    const feelsLike = forecastData.feelsLike || temp;
    
    const humidity = forecastData.humidity || 0;
    const pressure = forecastData.pressure || 1013;
    const visibility = (forecastData.visibility || 10000) / 1000; // в км
    
    const windSpeed = forecastData.windSpeed || 0;
    const windDeg = forecastData.windDeg || 0;
    const windDirection = getWindDirection(windDeg);
    
    // Время восхода и заката
    let sunriseTime = 'Неизвестно';
    let sunsetTime = 'Неизвестно';
    
    if (forecastData.sunrise) {
      const sunrise = DateTime.fromSeconds(forecastData.sunrise).setZone(timezone);
      sunriseTime = sunrise.toFormat('HH:mm');
    }
    if (forecastData.sunset) {
      const sunset = DateTime.fromSeconds(forecastData.sunset).setZone(timezone);
      sunsetTime = sunset.toFormat('HH:mm');
    }
    
    // Периоды суток (используем данные из timePeriods, если есть)
    const timePeriods = forecastData.timePeriods;
    const periodTexts: string[] = [];
    
    if (timePeriods) {
      // Утро (6:00-9:00) - по ТЗ
      if (timePeriods.утро) {
        const period = timePeriods.утро;
        const tempStr = period.avgTemp >= 0 ? `+${period.avgTemp.toFixed(1)}` : period.avgTemp.toFixed(1);
        periodTexts.push(
          `${period.emoji} Утро (6:00-9:00): ${tempStr}°C, ветер ${period.avgWind.toFixed(1)} м/с`
        );
      }
      
      // День (12:00-15:00) - по ТЗ
      if (timePeriods.день) {
        const period = timePeriods.день;
        const tempStr = period.avgTemp >= 0 ? `+${period.avgTemp.toFixed(1)}` : period.avgTemp.toFixed(1);
        periodTexts.push(
          `${period.emoji} День (12:00-15:00): ${tempStr}°C, ветер ${period.avgWind.toFixed(1)} м/с`
        );
      }
      
      // Вечер (18:00-21:00) - по ТЗ
      if (timePeriods.вечер) {
        const period = timePeriods.вечер;
        const tempStr = period.avgTemp >= 0 ? `+${period.avgTemp.toFixed(1)}` : period.avgTemp.toFixed(1);
        periodTexts.push(
          `${period.emoji} Вечер (18:00-21:00): ${tempStr}°C, ветер ${period.avgWind.toFixed(1)} м/с`
        );
      }
      
      // Ночь (0:00-3:00) - по ТЗ
      if (timePeriods.ночь) {
        const period = timePeriods.ночь;
        const tempStr = period.avgTemp >= 0 ? `+${period.avgTemp.toFixed(1)}` : period.avgTemp.toFixed(1);
        periodTexts.push(
          `${period.emoji} Ночь (0:00-3:00): ${tempStr}°C, ветер ${period.avgWind.toFixed(1)} м/с`
        );
      }
    }
    
    const periodText = periodTexts.length > 0 
      ? periodTexts.join('\n')
      : 'Нет данных по периодам';
    
    // Формируем сообщение по точному ТЗ
    let message = `🌍 ${cityName}, ${countryCode} | Прогноз на ${dateStr}\n\n`;
    message += `${conditionEmoji} ${condition}\n\n`;
    message += `🌡 Температура: ${temp.toFixed(1)}°C\n`;
    message += `🤚 Ощущается как: ${feelsLike.toFixed(1)}°C\n`;
    message += `💧 Влажность: ${humidity}%\n`;
    message += `📊 Давление: ${pressure} гПа\n`;
    message += `👁 Видимость: ${visibility.toFixed(1)} км\n`;
    message += `💨 Ветер: ${windSpeed.toFixed(1)} м/с, ${windDirection}\n\n`;
    message += `${periodText}\n\n`;
    message += `🌅 Восход: ${sunriseTime}\n`;
    message += `🌇 Закат: ${sunsetTime}`;
    
    // Добавляем рекомендации (используем расширенные, если есть)
    if (includeRecommendations) {
      const recommendation = forecastData.detailedRecommendation || getTemperatureRecommendation(temp, feelsLike);
      message += `\n\n💡 Рекомендации:\n${recommendation}`;
    }
    
    // Добавляем предупреждения
    const warning = forecastData.warning || '';
    if (includeWarnings) {
      if (warning && warning !== 'Предупреждений МЧС нет.') {
        message += `\n\n⚠️ ${warning}`;
      } else {
        message += '\n\n⚠️ Предупреждений МЧС нет.';
      }
    }
    
    return message;
  } catch (error) {
    return `🌍 ${cityName}, ${countryCode} | Прогноз на ${forecastData.dateStr || 'дату'}\n\n⚠️ Не удалось получить детальные данные о прогнозе.\n\nПожалуйста, попробуйте обновить данные через несколько минут.`;
  }
}

/**
 * Отформатировать почасовой прогноз (улучшенная версия с шагом 1 час)
 */
export function formatHourlyForecast(
  hourlyData: HourlyForecastData[],
  cityName: string,
  dateStr: string,
  compact: boolean = false
): string {
  try {
    if (!hourlyData || hourlyData.length === 0) {
      return `⏱️ Нет данных почасового прогноза для ${cityName} на ${dateStr}`;
    }
    
    // Заголовок
    let message = `⏱️ Почасовой прогноз для ${cityName} на ${dateStr}\n\n`;
    
    // Если данных мало (до 12 часов), показываем все подробно
    if (hourlyData.length <= 12) {
      for (const hourData of hourlyData) {
        const timeStr = hourData.time || '00:00';
        const temp = hourData.temp || 0;
        const condition = hourData.condition || 'Неизвестно';
        const windSpeed = hourData.windSpeed || 0;
        
        // Определяем эмодзи для времени суток
        const hour = hourData.hour || 0;
        let timeEmoji: string;
        if (6 <= hour && hour < 12) {
          timeEmoji = '☀️';
        } else if (12 <= hour && hour < 18) {
          timeEmoji = '🌤️';
        } else if (18 <= hour && hour < 24) {
          timeEmoji = '🌆';
        } else {
          timeEmoji = '🌙';
        }
        
        if (compact) {
          message += `${timeStr} ${timeEmoji} ${temp.toFixed(1)}°C\n`;
        } else {
          message += `${timeStr} ${timeEmoji} ${temp.toFixed(1)}°C, 💨 ${windSpeed.toFixed(1)} м/с\n`;
        }
      }
    } else {
      // Если данных много (24 часа), показываем все с группировкой
      for (const hourData of hourlyData) {
        const timeStr = hourData.time || '00:00';
        const temp = hourData.temp || 0;
        const windSpeed = hourData.windSpeed || 0;
        
        // Определяем эмодзи для времени суток
        const hour = hourData.hour || 0;
        let timeEmoji: string;
        if (6 <= hour && hour < 12) {
          timeEmoji = '☀️';
        } else if (12 <= hour && hour < 18) {
          timeEmoji = '🌤️';
        } else if (18 <= hour && hour < 24) {
          timeEmoji = '🌆';
        } else {
          timeEmoji = '🌙';
        }
        
        message += `${timeStr} ${timeEmoji} ${temp.toFixed(1)}°C, 💨 ${windSpeed.toFixed(1)} м/с\n`;
      }
      
      // Добавляем сводку, если есть 24 часа данных
      if (hourlyData.length >= 24) {
        const temps = hourlyData.map(h => h.temp);
        const winds = hourlyData.map(h => h.windSpeed);
        const maxTemp = Math.max(...temps);
        const minTemp = Math.min(...temps);
        const avgWind = winds.reduce((a, b) => a + b, 0) / winds.length;
        
        message += `\n📊 Сводка за день:\n`;
        message += `Макс: ${maxTemp.toFixed(1)}°C, Мин: ${minTemp.toFixed(1)}°C, Средний ветер: ${avgWind.toFixed(1)} м/с`;
      }
    }
    
    return message.trim();
  } catch (error) {
    return 'Ошибка форматирования почасового прогноза';
  }
}

