/**
 * Confirmation Keyboard
 * 
 * Клавиатура для подтверждения действий.
 */

import { Markup } from 'telegraf';

export function confirmationKeyboard(parsedData: string): ReturnType<typeof Markup.inlineKeyboard> {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ Да, создать', 'nlp:confirm')
    ],
    [
      Markup.button.callback('✏️ Исправить', 'nlp:edit'),
      Markup.button.callback('❌ Отмена', 'nlp:cancel')
    ]
  ]);
}

