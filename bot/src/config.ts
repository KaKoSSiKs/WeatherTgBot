import { config as loadEnv } from 'dotenv';  
import { z } from 'zod';  

// Загружаем .env из корневой директории и из текущей директории
loadEnv({ path: '../.env' });
loadEnv({ path: '.env' });  

const schema = z.object({  
  BOT_TOKEN: z.string().min(1, 'BOT_TOKEN is required'),
  DATABASE_URL: z.string().min(1).default('file:./prisma/dev.db'),  
  WEATHER_API_PROVIDER: z.enum(['openweathermap']).default('openweathermap'),  
  WEATHER_API_KEY: z.string().min(1, 'WEATHER_API_KEY is required'),
  WEATHER_API_LANG: z.string().default('ru'),  
  WEATHER_UNITS: z.enum(['metric', 'imperial']).default('metric'),  
  TZ: z.string().default('Europe/Moscow')  
});  

export type AppConfig = z.infer<typeof schema>;  
export const appConfig: AppConfig = schema.parse(process.env);
