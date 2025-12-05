import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

// Создаем экземпляр Prisma с обработкой ошибок
export const prisma = new PrismaClient({
  log: ['error', 'warn'],
  errorFormat: 'pretty',
});

// Функция для проверки подключения к БД
export async function connectPrisma(): Promise<void> {
  try {
    await prisma.$connect();
    logger('Prisma connected successfully');
  } catch (error) {
    logger('Failed to connect to database:', error);
    throw error;
  }
}

// Функция для отключения от БД
export async function disconnectPrisma(): Promise<void> {
  try {
    await prisma.$disconnect();
    logger('Prisma disconnected');
  } catch (error) {
    logger('Error disconnecting Prisma:', error);
  }
}
