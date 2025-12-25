/**
 * Settings Keyboards
 * 
 * Клавиатуры для настроек.
 */

import { Markup } from 'telegraf';
import { SettingsCallback, NavCallback } from './callback-data';

/**
 * Главное меню настроек
 */
export function getSettingsMainKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('📍 Города', SettingsCallback.create('cities', 'show')),
    ],
    [
      Markup.button.callback('⚙️ Параметры', SettingsCallback.create('parameters', 'show')),
    ],
    [
      Markup.button.callback('⬅️ Главное меню', NavCallback.create('main_menu')),
    ],
  ]);
}

/**
 * Клавиатура для меню городов
 */
export function getCitiesMenuKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('➕ Добавить город', SettingsCallback.create('cities', 'add', '0')),
      Markup.button.callback('🗑 Удалить город', SettingsCallback.create('cities', 'delete_menu')),
    ],
    [
      Markup.button.callback('📌 Сделать основным', SettingsCallback.create('cities', 'set_main_menu')),
    ],
    [
      Markup.button.callback('⬅️ Назад', SettingsCallback.create('main', 'show')),
    ],
  ]);
}

/**
 * Клавиатура для выбора города для удаления
 */
export function getCityDeleteKeyboard(
  locations: Array<{ id: number; name: string }>
) {
  const buttons: any[] = [];
  
  // Добавляем кнопки для каждого города (по 2 в ряд)
  for (let i = 0; i < locations.length; i += 2) {
    const row: any[] = [];
    row.push(Markup.button.callback(
      `🗑 ${locations[i].name}`,
      SettingsCallback.create('cities', 'delete', locations[i].id)
    ));
    
    if (i + 1 < locations.length) {
      row.push(Markup.button.callback(
        `🗑 ${locations[i + 1].name}`,
        SettingsCallback.create('cities', 'delete', locations[i + 1].id)
      ));
    }
    
    buttons.push(row);
  }
  
  buttons.push([
    Markup.button.callback('⬅️ Назад', SettingsCallback.create('cities', 'show')),
  ]);
  
  return Markup.inlineKeyboard(buttons);
}

/**
 * Клавиатура для выбора города как основного
 */
export function getCitySetMainKeyboard(
  locations: Array<{ id: number; name: string }>
) {
  const buttons: any[] = [];
  
  // Добавляем кнопки для каждого города (по 2 в ряд)
  for (let i = 0; i < locations.length; i += 2) {
    const row: any[] = [];
    row.push(Markup.button.callback(
      `📌 ${locations[i].name}`,
      SettingsCallback.create('cities', 'set_main', locations[i].id)
    ));
    
    if (i + 1 < locations.length) {
      row.push(Markup.button.callback(
        `📌 ${locations[i + 1].name}`,
        SettingsCallback.create('cities', 'set_main', locations[i + 1].id)
      ));
    }
    
    buttons.push(row);
  }
  
  buttons.push([
    Markup.button.callback('⬅️ Назад', SettingsCallback.create('cities', 'show')),
  ]);
  
  return Markup.inlineKeyboard(buttons);
}

/**
 * Клавиатура для быстрого выбора популярных городов
 */
export function getLocationQuickPickKeyboard() {
  const popularCities = [
    'Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург',
    'Казань', 'Нижний Новгород', 'Челябинск', 'Самара',
  ];
  
  const buttons: any[] = [];
  
  // По 2 города в ряд
  for (let i = 0; i < popularCities.length; i += 2) {
    const row: any[] = [];
    row.push(Markup.button.text(popularCities[i]));
    
    if (i + 1 < popularCities.length) {
      row.push(Markup.button.text(popularCities[i + 1]));
    }
    
    buttons.push(row);
  }
  
  buttons.push([
    Markup.button.callback('❌ Отмена', SettingsCallback.create('cities', 'cancel_add')),
  ]);
  
  return Markup.keyboard(buttons).resize();
}

/**
 * Клавиатура для запроса геолокации
 */
export function getLocationShareKeyboard() {
  return Markup.keyboard([
    [Markup.button.locationRequest('📍 Отправить геолокацию')],
    [Markup.button.callback('❌ Отмена', SettingsCallback.create('cities', 'cancel_add'))],
  ]).resize().oneTime();
}

