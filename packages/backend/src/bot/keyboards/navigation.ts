/**
 * Navigation Keyboard Utilities
 * 
 * Утилиты для создания навигационных кнопок.
 */

import { Markup } from 'telegraf';
import { NavCallback } from './callback_data';
import { canGoBack } from '../../shared/utils/navigation';

/**
 * Создает строку с навигационными кнопками (Назад и Главное меню)
 */
export function createNavigationButtons(userId: number): ReturnType<typeof Markup.inlineKeyboard> {
  const hasBack = canGoBack(userId);
  const buttons = [];

  if (hasBack) {
    buttons.push(Markup.button.callback('⬅️ Назад', NavCallback.create('back')));
  }
  
  buttons.push(Markup.button.callback('🏠 Главное меню', NavCallback.create('main_menu')));
  
  return Markup.inlineKeyboard([buttons]);
}

/**
 * Добавляет навигационные кнопки к существующей клавиатуре
 */
export function addNavigationButtons(keyboard: any[][], userId: number): any[][] {
  const hasBack = canGoBack(userId);
  const navButtons = [];

  if (hasBack) {
    navButtons.push(Markup.button.callback('⬅️ Назад', NavCallback.create('back')));
  }
  
  navButtons.push(Markup.button.callback('🏠 Главное меню', NavCallback.create('main_menu')));
  
  return [...keyboard, navButtons];
}

