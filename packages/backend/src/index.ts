/**
 * Backend Entry Point
 * 
 * Точка входа для единого backend сервера.
 * Инициализирует Telegram Bot.
 */

import { startBot } from './bot/index';

// Запускаем Telegram Bot
startBot().catch((error) => {
  console.error('Failed to start backend:', error);
  process.exit(1);
});

