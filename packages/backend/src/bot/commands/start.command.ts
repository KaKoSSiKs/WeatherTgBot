/**
 * Start Command
 * 
 * Команда /start - регистрация и приветствие пользователя.
 */

import type { Context } from 'telegraf';
import { UserRepository } from '../../storage/prisma/repositories';
import { logger } from '../../shared/utils/logger';
import { mainMenuKeyboard, MAIN_MENU_TEXT } from '../keyboards';
import { resetToMainMenu } from '../../shared/utils/navigation';

/**
 * Обработать команду /start
 */
export async function handleStartCommand(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  const telegramId = userId?.toString();
  
  if (!telegramId || !userId) {
    await ctx.reply('❌ Ошибка: не удалось определить ваш ID.');
    return;
  }
  
  try {
    const userRepo = new UserRepository();
    
    // Проверяем, существует ли пользователь
    let user = await userRepo.findByTelegramId(telegramId);
    
    if (!user) {
      // Создаем нового пользователя
      user = await userRepo.create({
        telegramId,
        languageCode: ctx.from?.language_code || 'ru',
      });
      
      logger.info(`New user registered: ${telegramId}`);
    }
    
    // Сбрасываем навигацию и устанавливаем главное меню
    resetToMainMenu(userId);
    
    // Показываем главное меню
    const message = await ctx.reply(MAIN_MENU_TEXT, mainMenuKeyboard());
    
    // Сохраняем состояние навигации
    if (message && 'message_id' in message) {
      const { pushNavigationState } = await import('../../shared/utils/navigation');
      pushNavigationState(userId, 'main_menu', {}, message.message_id);
    }
    
  } catch (error) {
    logger.error('Error in /start command:', error);
    await ctx.reply('❌ Произошла ошибка при регистрации. Попробуйте позже.');
  }
}

