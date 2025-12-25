/**
 * Notifications Keyboards
 * 
 * Клавиатуры для управления уведомлениями.
 */

import { Markup } from 'telegraf';
import { NotificationCallback, NavCallback } from './callback-data';

/**
 * Главное меню уведомлений
 */
export function getNotificationMainKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('📋 Список уведомлений', NotificationCallback.create('list')),
      Markup.button.callback('➕ Создать', NotificationCallback.create('create', 0)),
    ],
    [
      Markup.button.callback('⬅️ Главное меню', NavCallback.create('main_menu')),
    ],
  ]);
}

/**
 * Клавиатура для списка уведомлений
 */
export function getNotificationListKeyboard(notifications: Array<{ id: number; enabled: boolean; customName?: string | null }>) {
  const buttons: any[] = [];
  
  // Добавляем кнопки для каждого уведомления
  notifications.forEach((notif) => {
    const status = notif.enabled ? '✅' : '❌';
    const name = notif.customName || `Уведомление #${notif.id}`;
    buttons.push([
      Markup.button.callback(
        `${status} ${name}`,
        NotificationCallback.create('detail', notif.id)
      ),
    ]);
  });
  
  buttons.push([
    Markup.button.callback('➕ Создать', NotificationCallback.create('create', 0)),
    Markup.button.callback('⬅️ Назад', NotificationCallback.create('main')),
  ]);
  
  return Markup.inlineKeyboard(buttons);
}

/**
 * Клавиатура для деталей уведомления
 */
export function getNotificationDetailKeyboard(notificationId: number, enabled: boolean) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(
        enabled ? '⏸ Отключить' : '▶️ Включить',
        NotificationCallback.create('toggle', notificationId)
      ),
      Markup.button.callback('✏️ Редактировать', NotificationCallback.create('edit', notificationId)),
    ],
    [
      Markup.button.callback('🗑 Удалить', NotificationCallback.create('delete', notificationId)),
    ],
    [
      Markup.button.callback('⬅️ Назад', NotificationCallback.create('list')),
    ],
  ]);
}

/**
 * Клавиатура для подтверждения удаления
 */
export function getNotificationDeleteConfirmKeyboard(notificationId: number) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ Да, удалить', NotificationCallback.create('delete_confirm', notificationId)),
      Markup.button.callback('❌ Отмена', NotificationCallback.create('detail', notificationId)),
    ],
  ]);
}

