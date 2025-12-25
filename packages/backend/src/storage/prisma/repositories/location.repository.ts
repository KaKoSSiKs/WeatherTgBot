/**
 * Location Repository
 * 
 * Репозиторий для работы с локациями пользователей.
 * Только CRUD операции, без бизнес-логики.
 */

import { prisma } from '../client';
import type { Location, Prisma } from '@prisma/client';

export type CreateLocationData = Prisma.LocationCreateInput;
export type UpdateLocationData = Prisma.LocationUpdateInput;

export class LocationRepository {
  /**
   * Найти все локации пользователя
   */
  async findByUserId(userId: number): Promise<Location[]> {
    return prisma.location.findMany({
      where: { userId },
      orderBy: {
        displayOrder: 'asc',
      },
    });
  }

  /**
   * Найти локацию по ID
   */
  async findById(id: number): Promise<Location | null> {
    return prisma.location.findUnique({
      where: { id },
    });
  }

  /**
   * Найти локацию по ID и User ID (проверка принадлежности)
   */
  async findByIdAndUserId(
    id: number,
    userId: number
  ): Promise<Location | null> {
    return prisma.location.findFirst({
      where: {
        id,
        userId,
      },
    });
  }

  /**
   * Создать новую локацию
   */
  async create(data: CreateLocationData): Promise<Location> {
    return prisma.location.create({
      data,
    });
  }

  /**
   * Обновить локацию
   */
  async update(id: number, data: UpdateLocationData): Promise<Location> {
    return prisma.location.update({
      where: { id },
      data,
    });
  }

  /**
   * Удалить локацию
   */
  async delete(id: number): Promise<Location> {
    return prisma.location.delete({
      where: { id },
    });
  }

  /**
   * Обновить порядок отображения локаций
   * 
   * @param updates - Массив объектов { id, displayOrder }
   */
  async updateDisplayOrder(
    updates: Array<{ id: number; displayOrder: number }>
  ): Promise<void> {
    await prisma.$transaction(
      updates.map(({ id, displayOrder }) =>
        prisma.location.update({
          where: { id },
          data: { displayOrder },
        })
      )
    );
  }

  /**
   * Найти локацию по названию для пользователя
   */
  async findByUserIdAndName(
    userId: number,
    name: string
  ): Promise<Location | null> {
    return prisma.location.findFirst({
      where: {
        userId,
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
    });
  }

  /**
   * Подсчитать количество локаций пользователя
   */
  async countByUserId(userId: number): Promise<number> {
    return prisma.location.count({
      where: { userId },
    });
  }
}
