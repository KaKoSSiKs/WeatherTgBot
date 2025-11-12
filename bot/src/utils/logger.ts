import { DateTime } from 'luxon';  

export function logger(message: string) {  
  const timestamp = DateTime.now().toISO();  
  console.log(`[${timestamp}] ${message}`);  
}  