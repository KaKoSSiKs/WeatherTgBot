/**
 * Add Command
 * 
 * Команда /add - добавление уведомлений о погоде.
 * Поддерживает NLP парсинг и интерактивный визард.
 */

import type { Context } from 'telegraf';
import { UserRepository } from '../../storage/prisma/repositories';
import { logger } from '../../shared/utils/logger';
import { NotificationService } from '../../services/notification';
import type { WeatherService } from '../../services/weather';
import { mainMenuKeyboard } from '../keyboards';

/**
 * Обработать команду /add
 */
export async function handleAddCommand(
  ctx: Context,
  notificationService: NotificationService,
  weatherService: WeatherService
): Promise<void> {
  const telegramId = ctx.from?.id?.toString();
  
  if (!telegramId) {
    await ctx.reply('❌ Ошибка: не удалось определить ваш ID.');
    return;
  }
  
  try {
    const userRepo = new UserRepository();
    const user = await userRepo.findByTelegramId(telegramId);
    
    if (!user) {
      await ctx.reply('❌ Пользователь не найден. Используйте /start для регистрации.');
      return;
    }
    
    // Если команда без параметров - показываем интерактивный визард
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    const args = text.trim().split(/\s+/).slice(1);
    
    if (args.length === 0) {
      // Интерактивный визард будет реализован в handlers/notifications
      await ctx.reply(
        '🔔 Создание уведомления\n\n' +
        'Выберите тип уведомления:',
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: '📅 Регулярный прогноз', callback_data: 'notification:create:type:forecast' },
                { text: '⚡ Погодное событие', callback_data: 'notification:create:type:event' },
              ],
              [
                { text: '⬅️ Главное меню', callback_data: 'menu:main' },
              ],
            ],
          },
        }
      );
      return;
    }
    
    // TODO: Реализовать NLP парсинг для текстовых команд
    // Пока просто показываем подсказку
    await ctx.reply(
      'Использование: /add <тип> <время> [дни] [местоположение]\n\n' +
      'Примеры:\n' +
      '• /add daily 09:00 Москва\n' +
      '• /add каждый день утром\n\n' +
      'Или используйте /add без параметров для интерактивной настройки.',
      mainMenuKeyboard()
    );
    
  } catch (error) {
    logger.error('Error in /add command:', error);
    await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
  }
}

