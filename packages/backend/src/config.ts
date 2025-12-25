/**
 * Configuration
 * 
 * Централизованная конфигурация приложения.
 * Загружает переменные окружения и валидирует их.
 */

import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

// Загружаем .env из корневой директории и из текущей
loadEnv({ path: '../../.env' });
loadEnv({ path: '.env' });

const schema = z.object({
  // Telegram Bot
  BOT_TOKEN: z.string().min(1, 'BOT_TOKEN is required'),
  
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  
  // Weather API
  // Можно использовать WEATHER_API_KEY или OPENWEATHER_API_KEY (оба поддерживаются)
  WEATHER_API_KEY: z.string().optional(),
  OPENWEATHER_API_KEY: z.string().optional(),
  
  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

// Валидация: хотя бы один из API ключей должен быть указан
const validatedSchema = schema.superRefine((data, ctx) => {
  if (!data.WEATHER_API_KEY && !data.OPENWEATHER_API_KEY) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Either WEATHER_API_KEY or OPENWEATHER_API_KEY must be provided',
      path: ['WEATHER_API_KEY'],
    });
  }
});

export type AppConfig = z.infer<typeof schema>;

export const appConfig: AppConfig = validatedSchema.parse(process.env);

