/**
 * Location Quick Pick Keyboard
 * 
 * Клавиатура для быстрого выбора города.
 */

import { Markup } from 'telegraf';
import { getQuickPickCities } from '../../integrations/geocoding/geocoding.service';
import { SettingsCallback, NavCallback } from './callback_data';

export function locationQuickPickKeyboard(): ReturnType<typeof Markup.inlineKeyboard> {
  const cities = getQuickPickCities();
  const keyboard: any[][] = [];
  
  cities.forEach((city, index) => {
    const rowIndex = Math.floor(index / 2);
    if (index % 2 === 0) {
      keyboard[rowIndex] = [];
    }
    keyboard[rowIndex].push(
      Markup.button.callback(`📍 ${city.name}`, SettingsCallback.create('cities', 'quick_add', city.name))
    );
  });
  
  keyboard.push([
    Markup.button.callback('❌ Отмена', NavCallback.create('main_menu'))
  ]);
  
  return Markup.inlineKeyboard(keyboard);
}

/**
 * Клавиатура для отправки геолокации
 */
export function locationShareKeyboard(): ReturnType<typeof Markup.inlineKeyboard> {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('❌ Отмена', 'setup:cancel')
    ]
  ]);
}

