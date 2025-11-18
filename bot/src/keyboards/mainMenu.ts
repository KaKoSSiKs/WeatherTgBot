import { InlineKeyboard } from 'grammy';

export function mainMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('🌤️ Получить погоду', 'menu:get_weather')
    .row()
    .text('⚙️ Настроить уведомления', 'menu:setup_notifications')
    .row()
    .text('📍 Указать локацию', 'menu:set_location');
}

