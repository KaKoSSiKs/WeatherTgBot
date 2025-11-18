import { InlineKeyboard } from 'grammy';

export function addMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('📅 Ежедневно', 'add:start:daily')
    .text('📆 По дням', 'add:start:weekly')
    .text('🌤️ По погоде', 'add:start:trigger')
    .row()
    .text('🕘 09:00', 'add:time:09:00')
    .text('🕛 12:00', 'add:time:12:00')
    .text('🕕 18:00', 'add:time:18:00')
    .row()
    .text('📍 Москва', 'add:city:moscow')
    .text('📍 СПб', 'add:city:spb')
    .text('📍 Лондон', 'add:city:london')
    .row()
    .text('Назад', 'add:back')
    .text('Главное меню', 'add:menu')
    .text('❌ Отмена', 'add:cancel');
}

