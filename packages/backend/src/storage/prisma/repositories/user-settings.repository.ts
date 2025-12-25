/**
 * UserSettings Repository
 * 
 * Репозиторий для работы с настройками пользователей.
 * Только CRUD операции, без бизнес-логики.
 */

import { prisma } from '../client';
import type { UserSettings, Prisma } from '@prisma/client';

export type CreateUserSettingsData = Prisma.UserSettingsCreateInput;
export type UpdateUserSettingsData = Prisma.UserSettingsUpdateInput;

export class UserSettingsRepository {
  /**
   * Найти настройки пользователя по User ID
   */
  async findByUserId(userId: number): Promise<UserSettings | null> {
    return prisma.userSettings.findUnique({
      where: { userId },
      include: {
        defaultLocation: true,
      },
    });
  }

  /**
   * Найти настройки по ID
   */
  async findById(id: number): Promise<UserSettings | null> {
    return prisma.userSettings.findUnique({
      where: { id },
      include: {
        defaultLocation: true,
      },
    });
  }

  /**
   * Создать настройки по умолчанию для пользователя
   */
  async createDefault(userId: number): Promise<UserSettings> {
    return prisma.userSettings.create({
      data: {
        user: {
          connect: { id: userId },
        },
      },
      include: {
        defaultLocation: true,
      },
    });
  }

  /**
   * Создать настройки с данными
   */
  async create(data: CreateUserSettingsData): Promise<UserSettings> {
    return prisma.userSettings.create({
      data,
      include: {
        defaultLocation: true,
      },
    });
  }

  /**
   * Обновить настройки пользователя
   */
  async update(
    userId: number,
    data: UpdateUserSettingsData
  ): Promise<UserSettings> {
    return prisma.userSettings.update({
      where: { userId },
      data,
      include: {
        defaultLocation: true,
      },
    });
  }

  /**
   * Установить дефолтную локацию
   * 
   * @param userId - ID пользователя
   * @param locationId - ID локации или null для сброса
   */
  async setDefaultLocation(
    userId: number,
    locationId: number | null
  ): Promise<UserSettings> {
    return prisma.userSettings.update({
      where: { userId },
      data: {
        defaultLocationId: locationId,
      },
      include: {
        defaultLocation: true,
      },
    });
  }

  /**
   * Удалить настройки пользователя
   */
  async delete(userId: number): Promise<UserSettings> {
    return prisma.userSettings.delete({
      where: { userId },
    });
  }

  /**
   * Создать или обновить настройки (upsert)
   */
  async upsert(
    userId: number,
    create: CreateUserSettingsData,
    update: UpdateUserSettingsData
  ): Promise<UserSettings> {
    return prisma.userSettings.upsert({
      where: { userId },
      create,
      update,
      include: {
        defaultLocation: true,
      },
    });
  }
}

