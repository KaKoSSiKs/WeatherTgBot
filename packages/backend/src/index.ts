/**
 * Backend Entry Point
 * 
 * Точка входа для единого backend сервера.
 * Инициализирует Telegram Bot и API Server.
 */

import { startBot } from './bot/index';
import { createApiServer, startApiServer } from './api/server';
import { logger } from './shared/utils/logger';
import { appConfig } from './config';

async function main() {
  try {
    // Запускаем API сервер
    const apiApp = await createApiServer();
    const apiPort = parseInt(process.env.API_PORT || '3001');
    await startApiServer(apiApp, apiPort);
    
    // Запускаем Telegram Bot
    await startBot();
    
    logger.info('Backend services started successfully');
  } catch (error) {
    logger.error('Failed to start backend:', error);
    process.exit(1);
  }
}

main();

