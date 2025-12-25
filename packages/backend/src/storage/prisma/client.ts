/**
 * Prisma Client
 * 
 * Singleton PrismaClient для всего приложения.
 * Защита от multiple instances в dev режиме.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../../shared/utils/logger';

// Глобальная переменная для хранения PrismaClient в dev режиме
// В production каждый раз создается новый экземпляр
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

/**
 * Получить или создать PrismaClient
 * 
 * В development: использует глобальную переменную для предотвращения
 * создания множественных экземпляров при hot-reload.
 * 
 * В production: создает новый экземпляр каждый раз.
 */
export function getPrismaClient(): PrismaClient {
  if (process.env.NODE_ENV === 'production') {
    return new PrismaClient({
      log: ['error', 'warn'],
    });
  }

  // В development используем глобальную переменную
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      log: ['query', 'error', 'warn'],
    });
  }

  return global.__prisma;
}

// Экспортируем singleton экземпляр
export const prisma = getPrismaClient();

/**
 * Подключиться к базе данных
 */
export async function connectPrisma(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('Prisma connected to database');
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    throw error;
  }
}

/**
 * Отключиться от базы данных
 */
export async function disconnectPrisma(): Promise<void> {
  try {
    await prisma.$disconnect();
    logger.info('Prisma disconnected from database');
  } catch (error) {
    logger.error('Error disconnecting from database:', error);
    throw error;
  }
}
