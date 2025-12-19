/**
 * Клавиатуры для системы уведомлений
 */

import { InlineKeyboard } from 'grammy';
import { NotificationCallback, NotifCreateCallback, NavCallback } from './callback_data';

/**
 * Главное меню уведомлений
 */
export function notificationMainKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('➕ Новая подписка', NotificationCallback.create('add'))
    .text('📋 Мои подписки', NotificationCallback.create('list'))
    .row()
    .text('⚙️ Настройки', NotificationCallback.create('settings'))
    .text('🏠 Главное меню', NavCallback.create('main_menu'));
}

/**
 * Клавиатура списка подписок
 */
export function notificationListKeyboard(
  notifications: Array<{ id: number; displayName: string; isActive: boolean }>,
  page: number = 0,
  totalPages: number = 1
): InlineKeyboard {
  const kb = new InlineKeyboard();
  
  // Кнопки для каждой подписки
  for (const notif of notifications) {
    const status = notif.isActive ? '✅' : '⏸️';
    kb.text(`${status} ${notif.displayName}`, NotificationCallback.create('detail', notif.id))
      .row();
  }
  
  // Пагинация
  if (totalPages > 1) {
    if (page > 0) {
      kb.text('⬅️', NotificationCallback.create('list', page - 1));
    }
    kb.text(`${page + 1}/${totalPages}`, NotificationCallback.create('list', page));
    if (page < totalPages - 1) {
      kb.text('➡️', NotificationCallback.create('list', page + 1));
    }
    kb.row();
  }
  
  // Навигация
  kb.text('➕ Создать', NotificationCallback.create('add'))
    .text('⬅️ Назад', NotificationCallback.create('main'));
  
  return kb;
}

/**
 * Клавиатура пустого списка подписок
 */
export function notificationEmptyListKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('➕ Создать первую подписку', NotificationCallback.create('add'))
    .row()
    .text('⬅️ Назад', NotificationCallback.create('main'));
}

/**
 * Клавиатура детальной информации о подписке
 */
export function notificationDetailKeyboard(
  notificationId: number,
  isActive: boolean
): InlineKeyboard {
  const toggleText = isActive ? '⏸️ Приостановить' : '▶️ Возобновить';
  
  return new InlineKeyboard()
    .text('✏️ Редактировать', NotificationCallback.create('edit', notificationId))
    .text(toggleText, NotificationCallback.create('toggle', notificationId))
    .row()
    .text('🔔 Тестовое', NotificationCallback.create('test', notificationId))
    .text('🗑️ Удалить', NotificationCallback.create('delete', notificationId))
    .row()
    .text('⬅️ К списку', NotificationCallback.create('list'))
    .text('🏠 Главное меню', NavCallback.create('main_menu'));
}

/**
 * Клавиатура подтверждения удаления
 */
export function notificationDeleteConfirmKeyboard(notificationId: number): InlineKeyboard {
  return new InlineKeyboard()
    .text('✅ Да, удалить', NotificationCallback.create('delete_confirm', notificationId))
    .text('❌ Отмена', NotificationCallback.create('detail', notificationId));
}

/**
 * Клавиатура для отправленного уведомления
 */
export function notificationSentKeyboard(notificationId: number): InlineKeyboard {
  return new InlineKeyboard()
    .text('🔄 Обновить', NotificationCallback.create('refresh', notificationId))
    .text('⏸️ Приостановить', NotificationCallback.create('toggle', notificationId))
    .row()
    .text('✏️ Изменить', NotificationCallback.create('edit', notificationId))
    .text('🗑️ Удалить', NotificationCallback.create('delete', notificationId))
    .row()
    .text('📋 Мои подписки', NotificationCallback.create('list'))
    .text('🏠 Главное меню', NavCallback.create('main_menu'));
}

// ==================== КЛАВИАТУРЫ СОЗДАНИЯ ПОДПИСКИ ====================

/**
 * Выбор типа подписки
 */
export function notifCreateTypeKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('📅 Регулярный прогноз', NotifCreateCallback.create('type', 'regular_forecast'))
    .row()
    .text('⚡ Погодные события', NotifCreateCallback.create('type', 'weather_event'))
    .row()
    .text('⬅️ Назад', NotificationCallback.create('main'))
    .text('❌ Отмена', NotifCreateCallback.create('cancel'));
}

/**
 * Выбор подтипа для регулярного прогноза
 */
export function notifCreateForecastSubtypeKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('🌤️ Текущая погода', NotifCreateCallback.create('subtype', 'current'))
    .text('📅 На сегодня', NotifCreateCallback.create('subtype', 'today'))
    .row()
    .text('📆 На завтра', NotifCreateCallback.create('subtype', 'tomorrow'))
    .row()
    .text('3 дня', NotifCreateCallback.create('subtype', '3day'))
    .text('7 дней', NotifCreateCallback.create('subtype', '7day'))
    .text('10 дней', NotifCreateCallback.create('subtype', '10day'))
    .row()
    .text('⬅️ Назад', NotifCreateCallback.create('back', 'type'))
    .text('❌ Отмена', NotifCreateCallback.create('cancel'));
}

/**
 * Выбор подтипа для погодных событий
 */
export function notifCreateEventSubtypeKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('🌡️ Изменение температуры', NotifCreateCallback.create('subtype', 'temperature_change'))
    .row()
    .text('🌧️ Осадки', NotifCreateCallback.create('subtype', 'precipitation'))
    .row()
    .text('💨 Сильный ветер', NotifCreateCallback.create('subtype', 'wind'))
    .row()
    .text('⬅️ Назад', NotifCreateCallback.create('back', 'type'))
    .text('❌ Отмена', NotifCreateCallback.create('cancel'));
}

/**
 * Выбор города (с последними использованными)
 */
export function notifCreateCityKeyboard(
  recentCities: Array<{ id: number; name: string }>
): InlineKeyboard {
  const kb = new InlineKeyboard();
  
  // Последние города
  for (const city of recentCities.slice(0, 3)) {
    kb.text(`📍 ${city.name}`, NotifCreateCallback.create('city', city.id.toString()))
      .row();
  }
  
  // Другие варианты
  kb.text('📍 Отправить геолокацию', NotifCreateCallback.create('city', 'location'))
    .row()
    .text('✏️ Ввести другой город', NotifCreateCallback.create('city', 'custom'))
    .row()
    .text('⬅️ Назад', NotifCreateCallback.create('back', 'subtype'))
    .text('❌ Отмена', NotifCreateCallback.create('cancel'));
  
  return kb;
}

/**
 * Выбор времени
 */
export function notifCreateTimeKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('07:00', NotifCreateCallback.create('time', '07:00'))
    .text('08:00', NotifCreateCallback.create('time', '08:00'))
    .text('09:00', NotifCreateCallback.create('time', '09:00'))
    .row()
    .text('12:00', NotifCreateCallback.create('time', '12:00'))
    .text('15:00', NotifCreateCallback.create('time', '15:00'))
    .text('18:00', NotifCreateCallback.create('time', '18:00'))
    .row()
    .text('21:00', NotifCreateCallback.create('time', '21:00'))
    .text('✏️ Своё время', NotifCreateCallback.create('time', 'custom'))
    .row()
    .text('⬅️ Назад', NotifCreateCallback.create('back', 'city'))
    .text('❌ Отмена', NotifCreateCallback.create('cancel'));
}

/**
 * Выбор частоты (расписания)
 */
export function notifCreateFrequencyKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('🔄 Каждый день', NotifCreateCallback.create('frequency', 'daily'))
    .row()
    .text('📅 Только в будни', NotifCreateCallback.create('frequency', 'weekdays'))
    .row()
    .text('🗓️ По выходным', NotifCreateCallback.create('frequency', 'weekends'))
    .row()
    .text('1️⃣ Только один раз', NotifCreateCallback.create('frequency', 'once'))
    .row()
    .text('⬅️ Назад', NotifCreateCallback.create('back', 'time'))
    .text('❌ Отмена', NotifCreateCallback.create('cancel'));
}

// ==================== КЛАВИАТУРЫ ДЛЯ ПОГОДНЫХ СОБЫТИЙ ====================

/**
 * Выбор направления изменения температуры
 */
export function notifCreateTempDirectionKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('↘️ Похолодание', NotifCreateCallback.create('event_param', 'decrease', 'direction'))
    .row()
    .text('↗️ Потепление', NotifCreateCallback.create('event_param', 'increase', 'direction'))
    .row()
    .text('↕️ Любое изменение', NotifCreateCallback.create('event_param', 'any', 'direction'))
    .row()
    .text('⬅️ Назад', NotifCreateCallback.create('back', 'city'))
    .text('❌ Отмена', NotifCreateCallback.create('cancel'));
}

/**
 * Выбор порога температуры
 */
export function notifCreateTempThresholdKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('3°C', NotifCreateCallback.create('event_param', '3', 'threshold'))
    .text('5°C', NotifCreateCallback.create('event_param', '5', 'threshold'))
    .text('7°C', NotifCreateCallback.create('event_param', '7', 'threshold'))
    .text('10°C', NotifCreateCallback.create('event_param', '10', 'threshold'))
    .row()
    .text('✏️ Другое значение', NotifCreateCallback.create('event_param', 'custom', 'threshold'))
    .row()
    .text('⬅️ Назад', NotifCreateCallback.create('back', 'temp_direction'))
    .text('❌ Отмена', NotifCreateCallback.create('cancel'));
}

/**
 * Выбор типа осадков
 */
export function notifCreatePrecipTypeKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('🌧️ Дождь', NotifCreateCallback.create('event_param', 'rain', 'precip_type'))
    .row()
    .text('❄️ Снег', NotifCreateCallback.create('event_param', 'snow', 'precip_type'))
    .row()
    .text('🌨️ Любые осадки', NotifCreateCallback.create('event_param', 'any', 'precip_type'))
    .row()
    .text('⬅️ Назад', NotifCreateCallback.create('back', 'city'))
    .text('❌ Отмена', NotifCreateCallback.create('cancel'));
}

/**
 * Выбор события осадков (начало/конец)
 */
export function notifCreatePrecipEventKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('▶️ Начало осадков', NotifCreateCallback.create('event_param', 'start', 'precip_event'))
    .row()
    .text('⏹️ Окончание осадков', NotifCreateCallback.create('event_param', 'end', 'precip_event'))
    .row()
    .text('⬅️ Назад', NotifCreateCallback.create('back', 'precip_type'))
    .text('❌ Отмена', NotifCreateCallback.create('cancel'));
}

/**
 * Выбор порога ветра
 */
export function notifCreateWindThresholdKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('10 м/с', NotifCreateCallback.create('event_param', '10', 'wind_threshold'))
    .text('15 м/с', NotifCreateCallback.create('event_param', '15', 'wind_threshold'))
    .row()
    .text('20 м/с', NotifCreateCallback.create('event_param', '20', 'wind_threshold'))
    .text('25 м/с', NotifCreateCallback.create('event_param', '25', 'wind_threshold'))
    .row()
    .text('✏️ Другое значение', NotifCreateCallback.create('event_param', 'custom', 'wind_threshold'))
    .row()
    .text('⬅️ Назад', NotifCreateCallback.create('back', 'city'))
    .text('❌ Отмена', NotifCreateCallback.create('cancel'));
}

/**
 * Выбор частоты проверки для погодных событий
 */
export function notifCreateCheckIntervalKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('Каждые 2 часа', NotifCreateCallback.create('event_param', '2', 'check_interval'))
    .row()
    .text('Каждые 3 часа', NotifCreateCallback.create('event_param', '3', 'check_interval'))
    .row()
    .text('Каждые 6 часов', NotifCreateCallback.create('event_param', '6', 'check_interval'))
    .row()
    .text('✏️ Другая частота', NotifCreateCallback.create('event_param', 'custom', 'check_interval'))
    .row()
    .text('⬅️ Назад', NotifCreateCallback.create('back', 'event_param'))
    .text('❌ Отмена', NotifCreateCallback.create('cancel'));
}

/**
 * Подтверждение создания подписки
 */
export function notifCreateConfirmKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('✅ Создать подписку', NotifCreateCallback.create('confirm'))
    .row()
    .text('✏️ Дать название', NotifCreateCallback.create('name'))
    .row()
    .text('⬅️ Назад', NotifCreateCallback.create('back', 'frequency'))
    .text('❌ Отмена', NotifCreateCallback.create('cancel'));
}

/**
 * Успешное создание подписки
 */
export function notifCreateSuccessKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('➕ Ещё подписка', NotificationCallback.create('add'))
    .text('📋 Мои подписки', NotificationCallback.create('list'))
    .row()
    .text('🏠 Главное меню', NavCallback.create('main_menu'));
}

