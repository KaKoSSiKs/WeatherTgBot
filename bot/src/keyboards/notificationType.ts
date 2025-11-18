import { InlineKeyboard } from 'grammy';

export type NotificationType = 'daily' | 'weekly' | 'trigger';

export function notificationTypeKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('🗓️ Ежедневно', 'setup:type:daily')
    .row()
    .text('📅 По дням недели', 'setup:type:weekly')
    .row()
    .text('⚡ По событиям', 'setup:type:trigger');
}

