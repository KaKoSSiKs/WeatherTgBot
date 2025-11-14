import { DateTime } from 'luxon';

export function logger(...args: unknown[]): void {
  const timestamp = DateTime.now().toISO();
  const message = args.map(arg => 
    typeof arg === 'string' ? arg : JSON.stringify(arg)
  ).join(' ');
  console.log(`[${timestamp}] ${message}`);
}  