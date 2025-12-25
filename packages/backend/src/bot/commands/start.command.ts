/**
 * Start Command
 * 
 * Команда /start - регистрация и приветствие пользователя с главным меню.
 */

import type { Context } from 'telegraf';
import { UserRepository, UserSettingsRepository } from '../../storage/prisma/repositories';
import { logger } from '../../shared/utils/logger';
import { mainMenuKeyboard, MAIN_MENU_TEXT } from '../keyboards';

/**
 * Обработать команду /start
 */
export async function handleStartCommand(ctx: Context): Promise<void> {
  const telegramId = ctx.from?.id?.toString();
  
  if (!telegramId) {
    await ctx.reply('❌ Ошибка: не удалось определить ваш ID.');
    return;
  }
  
  try {
    const userRepo = new UserRepository();
    const settingsRepo = new UserSettingsRepository();
    
    // Проверяем, существует ли пользователь
    let user = await userRepo.findByTelegramId(telegramId);
    
    if (!user) {
      // Создаем нового пользователя
      user = await userRepo.create({
        telegramId,
        languageCode: ctx.from?.language_code || 'ru',
      });
      
      // Создаем настройки по умолчанию
      await settingsRepo.createDefault(user.id);
      
      logger.info(`New user registered: ${telegramId}`);
    }
    
    // Приветствие с главным меню (БЕЗ имени, как в старом боте)
    const welcomeMessage = MAIN_MENU_TEXT;
    
    await ctx.reply(welcomeMessage, mainMenuKeyboard());
    
  } catch (error) {
    logger.error('Error in /start command:', error);
    await ctx.reply('❌ Произошла ошибка при регистрации. Попробуйте позже.');
  }
}

