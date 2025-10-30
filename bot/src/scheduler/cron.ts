import cron from 'node-cron';

export type CronJobHandle = {
  stop: () => void;
};

export function scheduleEveryMinute(task: () => Promise<void> | void): CronJobHandle {
  const scheduled = cron.schedule('* * * * *', () => void task(), { timezone: process.env.TZ || 'UTC' });
  return {
    stop: () => scheduled.stop()
  };
}
