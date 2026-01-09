/**
 * Cron Scheduler
 * 
 * Планировщик задач на основе node-cron.
 */

import cron from 'node-cron';

export type CronJobHandle = {
  stop: () => void;
};

/**
 * Запланировать задачу на выполнение каждую минуту
 */
export function scheduleEveryMinute(task: () => Promise<void> | void): CronJobHandle {
  const scheduled = cron.schedule('* * * * *', () => void task(), { 
    timezone: process.env.TZ || 'UTC' 
  });
  return {
    stop: () => scheduled.stop()
  };
}

/**
 * Запланировать задачу на выполнение по расписанию
 */
export function schedule(cronExpression: string, task: () => Promise<void> | void, timezone?: string): CronJobHandle {
  const scheduled = cron.schedule(cronExpression, () => void task(), { 
    timezone: timezone || process.env.TZ || 'UTC' 
  });
  return {
    stop: () => scheduled.stop()
  };
}

