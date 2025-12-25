/**
 * Bot Types
 * 
 * Типы для Telegram Bot transport layer.
 */

import type { Context } from 'telegraf';
import type { WeatherService } from '../../services/weather';

/**
 * Расширенный контекст с сервисами
 */
export interface BotContext extends Context {
  weatherService: WeatherService;
}

