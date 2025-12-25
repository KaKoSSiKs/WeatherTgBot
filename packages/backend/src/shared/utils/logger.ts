/**
 * Logger Utility
 * 
 * Централизованное логирование для всего backend.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function formatTimestamp(): string {
  return new Date().toISOString();
}

function formatMessage(level: LogLevel, message: string, ...args: any[]): string {
  const timestamp = formatTimestamp();
  const argsStr = args.length > 0 ? ' ' + args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ') : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${argsStr}`;
}

export const logger = {
  info(message: string, ...args: any[]): void {
    console.log(formatMessage('info', message, ...args));
  },

  warn(message: string, ...args: any[]): void {
    console.warn(formatMessage('warn', message, ...args));
  },

  error(message: string, ...args: any[]): void {
    console.error(formatMessage('error', message, ...args));
  },

  debug(message: string, ...args: any[]): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(formatMessage('debug', message, ...args));
    }
  },
};

// Экспорт функции для обратной совместимости
export default logger;
