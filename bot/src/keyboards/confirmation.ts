import { InlineKeyboard } from 'grammy';

export function confirmationKeyboard(parsedData: string): InlineKeyboard {
  return new InlineKeyboard()
    .text('✅ Да, создать', 'nlp:confirm')
    .row()
    .text('✏️ Исправить', 'nlp:edit')
    .text('❌ Отмена', 'nlp:cancel');
}

