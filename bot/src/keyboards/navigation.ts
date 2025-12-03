/**
 * Утилиты для создания навигационных кнопок
 */

import { InlineKeyboard } from 'grammy';
import { NavCallback } from './callback_data';
import { canGoBack } from '../utils/navigation';

/**
 * Создает строку с навигационными кнопками (Назад и Главное меню)
 */
export function createNavigationButtons(userId: number): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  const hasBack = canGoBack(userId);

  if (hasBack) {
    keyboard.text('⬅️ Назад', NavCallback.create('back'));
  }
  
  keyboard.text('🏠 Главное меню', NavCallback.create('main_menu'));
  
  return keyboard;
}

/**
 * Добавляет навигационные кнопки к существующей клавиатуре
 */
export function addNavigationButtons(keyboard: InlineKeyboard, userId: number): InlineKeyboard {
  const hasBack = canGoBack(userId);

  // Добавляем навигационные кнопки в новую строку
  keyboard.row();
  
  if (hasBack) {
    keyboard.text('⬅️ Назад', NavCallback.create('back'));
  }
  
  keyboard.text('🏠 Главное меню', NavCallback.create('main_menu'));
  
  return keyboard;
}

