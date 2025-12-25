/**
 * Notification Repository
 * 
 * Репозиторий для работы с уведомлениями.
 * Только CRUD операции, без бизнес-логики.
 */

import { prisma } from '../client';
import type { Notification, Location, Prisma } from '@prisma/client';

export type CreateNotificationData = Prisma.NotificationCreateInput;
export type UpdateNotificationData = Prisma.NotificationUpdateInput;

export interface NotificationWithRelations extends Notification {
  user: { telegramId: string };
  location: Location | null;
}

export class NotificationRepository {
  /**
   * Найти все уведомления пользователя
   */
  async findByUserId(userId: number): Promise<Notification[]> {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Найти активные уведомления пользователя
   */
  async findActiveByUserId(userId: number): Promise<Notification[]> {
    return prisma.notification.findMany({
      where: {
        userId,
        enabled: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Найти уведомление по ID
   */
  async findById(id: number): Promise<Notification | null> {
    return prisma.notification.findUnique({
      where: { id },
    });
  }

  /**
   * Найти уведомление по ID и User ID (проверка принадлежности)
   */
  async findByIdAndUserId(
    id: number,
    userId: number
  ): Promise<Notification | null> {
    return prisma.notification.findFirst({
      where: {
        id,
        userId,
      },
    });
  }

  /**
   * Найти активные уведомления, которые нужно отправить
   * 
   * @param now - Текущее время
   * @returns Уведомления с включенными relations (user, location)
   */
  async findActiveDue(now: Date): Promise<NotificationWithRelations[]> {
    return prisma.notification.findMany({
      where: {
        enabled: true,
        nextNotificationAt: {
          lte: now,
        },
        OR: [
          { pausedUntil: null },
          { pausedUntil: { lt: now } },
        ],
      },
      include: {
        user: {
          select: {
            telegramId: true,
          },
        },
        location: true,
      },
      orderBy: {
        nextNotificationAt: 'asc',
      },
    }) as Promise<NotificationWithRelations[]>;
  }

  /**
   * Создать новое уведомление
   */
  async create(data: CreateNotificationData): Promise<Notification> {
    return prisma.notification.create({
      data,
    });
  }

  /**
   * Обновить уведомление
   */
  async update(
    id: number,
    data: UpdateNotificationData
  ): Promise<Notification> {
    return prisma.notification.update({
      where: { id },
      data,
    });
  }

  /**
   * Приостановить уведомление до указанной даты
   */
  async pauseUntil(id: number, until: Date): Promise<Notification> {
    return prisma.notification.update({
      where: { id },
      data: {
        pausedUntil: until,
      },
    });
  }

  /**
   * Включить/выключить уведомление
   */
  async setEnabled(id: number, enabled: boolean): Promise<Notification> {
    return prisma.notification.update({
      where: { id },
      data: { enabled },
    });
  }

  /**
   * Обновить время следующего уведомления
   */
  async updateNextNotification(
    id: number,
    nextNotificationAt: Date | null
  ): Promise<Notification> {
    return prisma.notification.update({
      where: { id },
      data: { nextNotificationAt },
    });
  }

  /**
   * Обновить время последней проверки
   */
  async updateLastChecked(
    id: number,
    lastCheckedAt: Date
  ): Promise<Notification> {
    return prisma.notification.update({
      where: { id },
      data: { lastCheckedAt },
    });
  }

  /**
   * Удалить уведомление
   */
  async delete(id: number): Promise<Notification> {
    return prisma.notification.delete({
      where: { id },
    });
  }

  /**
   * Подсчитать количество уведомлений пользователя
   */
  async countByUserId(userId: number): Promise<number> {
    return prisma.notification.count({
      where: { userId },
    });
  }

  /**
   * Подсчитать количество активных уведомлений пользователя
   */
  async countActiveByUserId(userId: number): Promise<number> {
    return prisma.notification.count({
      where: {
        userId,
        enabled: true,
      },
    });
  }
}
