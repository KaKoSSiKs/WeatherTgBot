/**
 * User Repository
 * 
 * Репозиторий для работы с пользователями в БД.
 * Только CRUD операции, без бизнес-логики.
 */

import { prisma } from '../client';
import type { User, Prisma } from '@prisma/client';

export type CreateUserData = Prisma.UserCreateInput;
export type UpdateUserData = Prisma.UserUpdateInput;

export class UserRepository {
  /**
   * Найти пользователя по Telegram ID
   */
  async findByTelegramId(telegramId: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { telegramId },
    });
  }

  /**
   * Найти пользователя по ID
   */
  async findById(id: number): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * Создать нового пользователя
   */
  async create(data: CreateUserData): Promise<User> {
    return prisma.user.create({
      data,
    });
  }

  /**
   * Обновить пользователя
   */
  async update(telegramId: string, data: UpdateUserData): Promise<User> {
    return prisma.user.update({
      where: { telegramId },
      data,
    });
  }

  /**
   * Обновить пользователя по ID
   */
  async updateById(id: number, data: UpdateUserData): Promise<User> {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  /**
   * Удалить пользователя
   */
  async delete(telegramId: string): Promise<User> {
    return prisma.user.delete({
      where: { telegramId },
    });
  }

  /**
   * Удалить пользователя по ID
   */
  async deleteById(id: number): Promise<User> {
    return prisma.user.delete({
      where: { id },
    });
  }

  /**
   * Создать или обновить пользователя (upsert)
   */
  async upsert(
    telegramId: string,
    create: CreateUserData,
    update: UpdateUserData
  ): Promise<User> {
    return prisma.user.upsert({
      where: { telegramId },
      create,
      update,
    });
  }
}
