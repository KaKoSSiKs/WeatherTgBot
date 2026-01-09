/**
 * Notification Keyboards
 * 
 * Клавиатуры для системы уведомлений.
 */

import { Markup } from 'telegraf';
import { NotificationCallback, NotifCreateCallback, NavCallback } from './callback_data';

/**
 * Главное меню уведомлений
 */
export function notificationMainKeyboard(): ReturnType<typeof Markup.inlineKeyboard> {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('➕ Новая подписка', NotificationCallback.create('add')),
      Markup.button.callback('📋 Мои подписки', NotificationCallback.create('list'))
    ],
    [
      Markup.button.callback('🏠 Главное меню', NavCallback.create('main_menu'))
    ]
  ]);
}

/**
 * Клавиатура списка подписок
 */
export function notificationListKeyboard(
  notifications: Array<{ id: number; displayName: string; isActive: boolean }>,
  page: number = 0,
  totalPages: number = 1
): ReturnType<typeof Markup.inlineKeyboard> {
  const keyboard: any[][] = [];
  
  // Кнопки для каждой подписки
  for (const notif of notifications) {
    const status = notif.isActive ? '✅' : '⏸️';
    keyboard.push([
      Markup.button.callback(`${status} ${notif.displayName}`, NotificationCallback.create('detail', notif.id))
    ]);
  }
  
  // Пагинация
  if (totalPages > 1) {
    const paginationRow: any[] = [];
    if (page > 0) {
      paginationRow.push(Markup.button.callback('⬅️', NotificationCallback.create('list', page - 1)));
    }
    paginationRow.push(Markup.button.callback(`${page + 1}/${totalPages}`, NotificationCallback.create('list', page)));
    if (page < totalPages - 1) {
      paginationRow.push(Markup.button.callback('➡️', NotificationCallback.create('list', page + 1)));
    }
    keyboard.push(paginationRow);
  }
  
  // Навигация
  keyboard.push([
    Markup.button.callback('➕ Создать', NotificationCallback.create('add')),
    Markup.button.callback('⬅️ Назад', NotificationCallback.create('main'))
  ]);
  
  return Markup.inlineKeyboard(keyboard);
}

/**
 * Клавиатура пустого списка подписок
 */
export function notificationEmptyListKeyboard(): ReturnType<typeof Markup.inlineKeyboard> {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('➕ Создать первую подписку', NotificationCallback.create('add'))
    ],
    [
      Markup.button.callback('⬅️ Назад', NotificationCallback.create('main'))
    ]
  ]);
}

/**
 * Клавиатура детальной информации о подписке
 */
export function notificationDetailKeyboard(
  notificationId: number,
  isActive: boolean
): ReturnType<typeof Markup.inlineKeyboard> {
  const toggleText = isActive ? '⏸️ Приостановить' : '▶️ Возобновить';
  
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('✏️ Редактировать', NotificationCallback.create('edit', notificationId)),
      Markup.button.callback(toggleText, NotificationCallback.create('toggle', notificationId))
    ],
    [
      Markup.button.callback('🔔 Тестовое', NotificationCallback.create('test', notificationId)),
      Markup.button.callback('🗑️ Удалить', NotificationCallback.create('delete', notificationId))
    ],
    [
      Markup.button.callback('⬅️ К списку', NotificationCallback.create('list')),
      Markup.button.callback('🏠 Главное меню', NavCallback.create('main_menu'))
    ]
  ]);
}

/**
 * Клавиатура подтверждения удаления
 */
export function notificationDeleteConfirmKeyboard(notificationId: number): ReturnType<typeof Markup.inlineKeyboard> {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ Да, удалить', NotificationCallback.create('delete_confirm', notificationId)),
      Markup.button.callback('❌ Отмена', NotificationCallback.create('detail', notificationId))
    ]
  ]);
}

/**
 * Клавиатура для отправленного уведомления
 */
export function notificationSentKeyboard(notificationId: number): ReturnType<typeof Markup.inlineKeyboard> {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('🔄 Обновить', NotificationCallback.create('refresh', notificationId)),
      Markup.button.callback('⏸️ Приостановить', NotificationCallback.create('toggle', notificationId))
    ],
    [
      Markup.button.callback('✏️ Изменить', NotificationCallback.create('edit', notificationId)),
      Markup.button.callback('🗑️ Удалить', NotificationCallback.create('delete', notificationId))
    ],
    [
      Markup.button.callback('📋 Мои подписки', NotificationCallback.create('list')),
      Markup.button.callback('🏠 Главное меню', NavCallback.create('main_menu'))
    ]
  ]);
}

// ==================== КЛАВИАТУРЫ СОЗДАНИЯ ПОДПИСКИ ====================

/**
 * Выбор типа подписки
 */
export function notifCreateTypeKeyboard(): ReturnType<typeof Markup.inlineKeyboard> {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('📅 Регулярный прогноз', NotifCreateCallback.create('type', 'regular_forecast'))
    ],
    [
      Markup.button.callback('⚡ Погодные события', NotifCreateCallback.create('type', 'weather_event'))
    ],
    [
      Markup.button.callback('⬅️ Назад', NotificationCallback.create('main')),
      Markup.button.callback('❌ Отмена', NotifCreateCallback.create('cancel'))
    ]
  ]);
}

/**
 * Выбор подтипа для регулярного прогноза
 */
export function notifCreateForecastSubtypeKeyboard(): ReturnType<typeof Markup.inlineKeyboard> {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('🌤️ Текущая погода', NotifCreateCallback.create('subtype', 'current')),
      Markup.button.callback('📅 На сегодня', NotifCreateCallback.create('subtype', 'today'))
    ],
    [
      Markup.button.callback('📆 На завтра', NotifCreateCallback.create('subtype', 'tomorrow'))
    ],
    [
      Markup.button.callback('3 дня', NotifCreateCallback.create('subtype', '3day')),
      Markup.button.callback('7 дней', NotifCreateCallback.create('subtype', '7day')),
      Markup.button.callback('10 дней', NotifCreateCallback.create('subtype', '10day'))
    ],
    [
      Markup.button.callback('⬅️ Назад', NotifCreateCallback.create('back', 'type')),
      Markup.button.callback('❌ Отмена', NotifCreateCallback.create('cancel'))
    ]
  ]);
}

/**
 * Выбор подтипа для погодных событий
 */
export function notifCreateEventSubtypeKeyboard(): ReturnType<typeof Markup.inlineKeyboard> {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('🌡️ Изменение температуры', NotifCreateCallback.create('subtype', 'temperature_change'))
    ],
    [
      Markup.button.callback('🌧️ Осадки', NotifCreateCallback.create('subtype', 'precipitation'))
    ],
    [
      Markup.button.callback('💨 Сильный ветер', NotifCreateCallback.create('subtype', 'wind'))
    ],
    [
      Markup.button.callback('⬅️ Назад', NotifCreateCallback.create('back', 'type')),
      Markup.button.callback('❌ Отмена', NotifCreateCallback.create('cancel'))
    ]
  ]);
}

/**
 * Выбор города (с последними использованными)
 */
export function notifCreateCityKeyboard(
  recentCities: Array<{ id: number; name: string }>
): ReturnType<typeof Markup.inlineKeyboard> {
  const keyboard: any[][] = [];
  
  // Последние города
  for (const city of recentCities.slice(0, 3)) {
    keyboard.push([
      Markup.button.callback(`📍 ${city.name}`, NotifCreateCallback.create('city', city.id.toString()))
    ]);
  }
  
  // Другие варианты
  keyboard.push([
    Markup.button.callback('📍 Отправить геолокацию', NotifCreateCallback.create('city', 'location'))
  ]);
  keyboard.push([
    Markup.button.callback('✏️ Ввести другой город', NotifCreateCallback.create('city', 'custom'))
  ]);
  keyboard.push([
    Markup.button.callback('⬅️ Назад', NotifCreateCallback.create('back', 'subtype')),
    Markup.button.callback('❌ Отмена', NotifCreateCallback.create('cancel'))
  ]);
  
  return Markup.inlineKeyboard(keyboard);
}

/**
 * Выбор времени
 */
export function notifCreateTimeKeyboard(): ReturnType<typeof Markup.inlineKeyboard> {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('07:00', NotifCreateCallback.create('time', '07:00')),
      Markup.button.callback('08:00', NotifCreateCallback.create('time', '08:00')),
      Markup.button.callback('09:00', NotifCreateCallback.create('time', '09:00'))
    ],
    [
      Markup.button.callback('12:00', NotifCreateCallback.create('time', '12:00')),
      Markup.button.callback('15:00', NotifCreateCallback.create('time', '15:00')),
      Markup.button.callback('18:00', NotifCreateCallback.create('time', '18:00'))
    ],
    [
      Markup.button.callback('21:00', NotifCreateCallback.create('time', '21:00')),
      Markup.button.callback('✏️ Своё время', NotifCreateCallback.create('time', 'custom'))
    ],
    [
      Markup.button.callback('⬅️ Назад', NotifCreateCallback.create('back', 'city')),
      Markup.button.callback('❌ Отмена', NotifCreateCallback.create('cancel'))
    ]
  ]);
}

/**
 * Выбор частоты (расписания)
 */
export function notifCreateFrequencyKeyboard(): ReturnType<typeof Markup.inlineKeyboard> {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('🔄 Каждый день', NotifCreateCallback.create('frequency', 'daily'))
    ],
    [
      Markup.button.callback('📅 Только в будни', NotifCreateCallback.create('frequency', 'weekdays'))
    ],
    [
      Markup.button.callback('🗓️ По выходным', NotifCreateCallback.create('frequency', 'weekends'))
    ],
    [
      Markup.button.callback('1️⃣ Только один раз', NotifCreateCallback.create('frequency', 'once'))
    ],
    [
      Markup.button.callback('⬅️ Назад', NotifCreateCallback.create('back', 'time')),
      Markup.button.callback('❌ Отмена', NotifCreateCallback.create('cancel'))
    ]
  ]);
}

// ==================== КЛАВИАТУРЫ ДЛЯ ПОГОДНЫХ СОБЫТИЙ ====================

/**
 * Выбор направления изменения температуры
 */
export function notifCreateTempDirectionKeyboard(): ReturnType<typeof Markup.inlineKeyboard> {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('↘️ Похолодание', NotifCreateCallback.create('event_param', 'decrease', 'direction'))
    ],
    [
      Markup.button.callback('↗️ Потепление', NotifCreateCallback.create('event_param', 'increase', 'direction'))
    ],
    [
      Markup.button.callback('↕️ Любое изменение', NotifCreateCallback.create('event_param', 'any', 'direction'))
    ],
    [
      Markup.button.callback('⬅️ Назад', NotifCreateCallback.create('back', 'city')),
      Markup.button.callback('❌ Отмена', NotifCreateCallback.create('cancel'))
    ]
  ]);
}

/**
 * Выбор порога температуры
 */
export function notifCreateTempThresholdKeyboard(): ReturnType<typeof Markup.inlineKeyboard> {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('3°C', NotifCreateCallback.create('event_param', '3', 'threshold')),
      Markup.button.callback('5°C', NotifCreateCallback.create('event_param', '5', 'threshold')),
      Markup.button.callback('7°C', NotifCreateCallback.create('event_param', '7', 'threshold')),
      Markup.button.callback('10°C', NotifCreateCallback.create('event_param', '10', 'threshold'))
    ],
    [
      Markup.button.callback('✏️ Другое значение', NotifCreateCallback.create('event_param', 'custom', 'threshold'))
    ],
    [
      Markup.button.callback('⬅️ Назад', NotifCreateCallback.create('back', 'temp_direction')),
      Markup.button.callback('❌ Отмена', NotifCreateCallback.create('cancel'))
    ]
  ]);
}

/**
 * Выбор типа осадков
 */
export function notifCreatePrecipTypeKeyboard(): ReturnType<typeof Markup.inlineKeyboard> {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('🌧️ Дождь', NotifCreateCallback.create('event_param', 'rain', 'precip_type'))
    ],
    [
      Markup.button.callback('❄️ Снег', NotifCreateCallback.create('event_param', 'snow', 'precip_type'))
    ],
    [
      Markup.button.callback('🌨️ Любые осадки', NotifCreateCallback.create('event_param', 'any', 'precip_type'))
    ],
    [
      Markup.button.callback('⬅️ Назад', NotifCreateCallback.create('back', 'city')),
      Markup.button.callback('❌ Отмена', NotifCreateCallback.create('cancel'))
    ]
  ]);
}

/**
 * Выбор события осадков (начало/конец)
 */
export function notifCreatePrecipEventKeyboard(): ReturnType<typeof Markup.inlineKeyboard> {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('▶️ Начало осадков', NotifCreateCallback.create('event_param', 'start', 'precip_event'))
    ],
    [
      Markup.button.callback('⏹️ Окончание осадков', NotifCreateCallback.create('event_param', 'end', 'precip_event'))
    ],
    [
      Markup.button.callback('⬅️ Назад', NotifCreateCallback.create('back', 'precip_type')),
      Markup.button.callback('❌ Отмена', NotifCreateCallback.create('cancel'))
    ]
  ]);
}

/**
 * Выбор порога ветра
 */
export function notifCreateWindThresholdKeyboard(): ReturnType<typeof Markup.inlineKeyboard> {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('10 м/с', NotifCreateCallback.create('event_param', '10', 'wind_threshold')),
      Markup.button.callback('15 м/с', NotifCreateCallback.create('event_param', '15', 'wind_threshold'))
    ],
    [
      Markup.button.callback('20 м/с', NotifCreateCallback.create('event_param', '20', 'wind_threshold')),
      Markup.button.callback('25 м/с', NotifCreateCallback.create('event_param', '25', 'wind_threshold'))
    ],
    [
      Markup.button.callback('✏️ Другое значение', NotifCreateCallback.create('event_param', 'custom', 'wind_threshold'))
    ],
    [
      Markup.button.callback('⬅️ Назад', NotifCreateCallback.create('back', 'city')),
      Markup.button.callback('❌ Отмена', NotifCreateCallback.create('cancel'))
    ]
  ]);
}

/**
 * Выбор частоты проверки для погодных событий
 */
export function notifCreateCheckIntervalKeyboard(): ReturnType<typeof Markup.inlineKeyboard> {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('Каждые 2 часа', NotifCreateCallback.create('event_param', '2', 'check_interval'))
    ],
    [
      Markup.button.callback('Каждые 3 часа', NotifCreateCallback.create('event_param', '3', 'check_interval'))
    ],
    [
      Markup.button.callback('Каждые 6 часов', NotifCreateCallback.create('event_param', '6', 'check_interval'))
    ],
    [
      Markup.button.callback('✏️ Другая частота', NotifCreateCallback.create('event_param', 'custom', 'check_interval'))
    ],
    [
      Markup.button.callback('⬅️ Назад', NotifCreateCallback.create('back', 'event_param')),
      Markup.button.callback('❌ Отмена', NotifCreateCallback.create('cancel'))
    ]
  ]);
}

/**
 * Подтверждение создания подписки
 */
export function notifCreateConfirmKeyboard(): ReturnType<typeof Markup.inlineKeyboard> {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ Создать подписку', NotifCreateCallback.create('confirm'))
    ],
    [
      Markup.button.callback('✏️ Дать название', NotifCreateCallback.create('name'))
    ],
    [
      Markup.button.callback('⬅️ Назад', NotifCreateCallback.create('back', 'frequency')),
      Markup.button.callback('❌ Отмена', NotifCreateCallback.create('cancel'))
    ]
  ]);
}

/**
 * Успешное создание подписки
 */
export function notifCreateSuccessKeyboard(): ReturnType<typeof Markup.inlineKeyboard> {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('➕ Ещё подписка', NotificationCallback.create('add')),
      Markup.button.callback('📋 Мои подписки', NotificationCallback.create('list'))
    ],
    [
      Markup.button.callback('🏠 Главное меню', NavCallback.create('main_menu'))
    ]
  ]);
}

