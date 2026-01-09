/**
 * Configuration
 * 
 * Централизованная конфигурация приложения.
 * Загружает переменные окружения и валидирует их.
 * 
 * TODO: Перенести из bot/src/config.ts после миграции
 */

import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

// Загружаем .env из корневой директории и из текущей
loadEnv({ path: '../../.env' });
loadEnv({ path: '.env' });

const schema = z.object({
  BOT_TOKEN: z.string().min(1, 'BOT_TOKEN is required'),
  DATABASE_URL: z.string().min(1).default('file:./prisma/dev.db'),
  WEATHER_API_PROVIDER: z.enum(['openweathermap']).default('openweathermap'),
  WEATHER_API_KEY: z.string().min(1, 'WEATHER_API_KEY is required'),
  OPENWEATHER_API_KEY: z.string().optional(), // Альтернативное имя для совместимости
  WEATHER_API_LANG: z.string().default('ru'),
  WEATHER_UNITS: z.enum(['metric', 'imperial']).default('metric'),
  TZ: z.string().default('Europe/Moscow'),
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development')
});

export type AppConfig = z.infer<typeof schema>;

// TODO: Реализовать после миграции
export const appConfig: AppConfig = schema.parse(process.env);

