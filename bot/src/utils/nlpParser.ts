import { DEFAULT_CITY, geocodeCity, type GeocodedLocation } from './geocoding';
import { prisma } from '../db/prisma';

export type ParsedNotification = {
  type: string;
  time: string | null;
  days: string | null;
  locationName: string | null;
  location: GeocodedLocation | null;
  isOneOff: boolean;
  confidence: 'high' | 'medium' | 'low';
};

const TIME_PATTERNS: Record<string, string> = {
  // Morning
  утро: '08:00',
  утром: '08:00',
  'с утра': '08:00',
  'на утро': '08:00',
  'по утрам': '08:00',
  // Afternoon
  день: '12:00',
  днем: '12:00',
  'в обед': '13:00',
  обед: '13:00',
  // Evening
  вечер: '20:00',
  вечером: '20:00',
  'на вечер': '20:00',
  'по вечерам': '20:00',
  // Night
  ночь: '22:00',
  ночью: '22:00',
  'на ночь': '22:00',
};

const TYPE_PATTERNS: Record<string, string> = {
  'каждый день': 'daily',
  ежедневно: 'daily',
  ежедневный: 'daily',
  'каждое утро': 'daily',
  'каждый вечер': 'daily',
  'по будням': 'weekly',
  будни: 'weekly',
  'в будни': 'weekly',
  'рабочие дни': 'weekly',
  'по выходным': 'weekly',
  выходные: 'weekly',
  'в выходные': 'weekly',
  'по погоде': 'trigger',
  'при изменении': 'trigger',
  'при ухудшении': 'trigger',
};

const DAY_NAMES: Record<string, string> = {
  понедельник: '1',
  вторник: '2',
  среда: '3',
  четверг: '4',
  пятница: '5',
  суббота: '6',
  воскресенье: '7',
  'в понедельник': '1',
  'во вторник': '2',
  'в среду': '3',
  'в четверг': '4',
  'в пятницу': '5',
  'в субботу': '6',
  'в воскресенье': '7',
};

const ONE_OFF_PATTERNS = ['завтра', 'послезавтра', 'сегодня', 'на завтра', 'на сегодня'];

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,!?;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTime(text: string): string | null {
  const normalized = normalizeText(text);

  // Check for explicit time format (HH:MM or H:MM)
  const timeMatch = normalized.match(/\b(\d{1,2}):(\d{2})\b/);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
  }

  // Check for time patterns
  for (const [pattern, time] of Object.entries(TIME_PATTERNS)) {
    if (normalized.includes(pattern)) {
      return time;
    }
  }

  // Check for "в X часов" or "в X час"
  const hourMatch = normalized.match(/\bв\s+(\d{1,2})\s+(час|часа|часов)\b/);
  if (hourMatch) {
    const hour = parseInt(hourMatch[1], 10);
    if (hour >= 0 && hour < 24) {
      return `${hour.toString().padStart(2, '0')}:00`;
    }
  }

  return null;
}

function extractType(text: string): string | null {
  const normalized = normalizeText(text);

  for (const [pattern, type] of Object.entries(TYPE_PATTERNS)) {
    if (normalized.includes(pattern)) {
      return type;
    }
  }

  return null;
}

function extractDays(text: string): string | null {
  const normalized = normalizeText(text);
  const foundDays: string[] = [];

  for (const [pattern, day] of Object.entries(DAY_NAMES)) {
    if (normalized.includes(pattern)) {
      if (!foundDays.includes(day)) {
        foundDays.push(day);
      }
    }
  }

  // Check for "по будням" or "рабочие дни"
  if (normalized.includes('будн') || normalized.includes('рабоч')) {
    return '1,2,3,4,5';
  }

  // Check for "выходные"
  if (normalized.includes('выходн')) {
    return '6,7';
  }

  if (foundDays.length > 0) {
    return foundDays.join(',');
  }

  return null;
}

function extractLocation(text: string): GeocodedLocation | null {
  const normalized = normalizeText(text);
  const words = normalized.split(/\s+/);

  // Try to find city name in the text
  for (let i = 0; i < words.length; i++) {
    for (let j = i + 1; j <= words.length; j++) {
      const candidate = words.slice(i, j).join(' ');
      const geocoded = geocodeCity(candidate);
      if (geocoded) {
        return geocoded;
      }
    }
  }

  return null;
}

function isOneOff(text: string): boolean {
  const normalized = normalizeText(text);
  return ONE_OFF_PATTERNS.some((pattern) => normalized.includes(pattern));
}

export async function getUserPreferences(userId: number): Promise<{
  preferredTime: string | null;
  preferredLocation: GeocodedLocation | null;
  preferredType: string | null;
}> {
  const notifications = await prisma.notification.findMany({
    where: { userId, enabled: true },
    include: { location: true },
    orderBy: { id: 'desc' },
    take: 10
  });

  if (notifications.length === 0) {
    return {
      preferredTime: null,
      preferredLocation: null,
      preferredType: null
    };
  }

  // Find most common time
  const timeCounts = new Map<string, number>();
  notifications.forEach((n) => {
    if (n.time) {
      timeCounts.set(n.time, (timeCounts.get(n.time) || 0) + 1);
    }
  });
  const preferredTime =
    Array.from(timeCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  // Find most recent location
  const lastLocation = notifications.find((n) => n.location);
  const preferredLocation = lastLocation?.location
    ? {
        name: lastLocation.location.name,
        latitude: lastLocation.location.latitude,
        longitude: lastLocation.location.longitude,
        aliases: []
      }
    : null;

  // Find most common type
  const typeCounts = new Map<string, number>();
  notifications.forEach((n) => {
    typeCounts.set(n.type, (typeCounts.get(n.type) || 0) + 1);
  });
  const preferredType =
    Array.from(typeCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  return {
    preferredTime,
    preferredLocation,
    preferredType
  };
}

export async function parseNotificationCommand(
  text: string,
  userId: number
): Promise<ParsedNotification> {
  const normalized = normalizeText(text);
  const preferences = await getUserPreferences(userId);

  // Extract components
  const extractedTime = extractTime(normalized);
  const extractedType = extractType(normalized);
  const extractedDays = extractDays(normalized);
  const extractedLocation = extractLocation(normalized);
  const oneOff = isOneOff(normalized);

  // Determine type
  let type = extractedType || preferences.preferredType || 'daily';
  if (oneOff && !extractedType) {
    type = 'one_off';
  }

  // Determine time
  let time = extractedTime || preferences.preferredTime || '09:00';

  // Determine days
  let days = extractedDays;
  if (type === 'weekly' && !days) {
    days = '1,2,3,4,5';
  }

  // Determine location
  let location = extractedLocation || preferences.preferredLocation || DEFAULT_CITY;
  let locationName = location.name;

  // Calculate confidence
  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (extractedTime && extractedType && extractedLocation) {
    confidence = 'high';
  } else if ((extractedTime || extractedType) && extractedLocation) {
    confidence = 'medium';
  }

  return {
    type,
    time,
    days,
    locationName,
    location,
    isOneOff: oneOff,
    confidence
  };
}

export function formatParsedNotification(parsed: ParsedNotification): string {
  const parts: string[] = [];

  // Type
  const typeNames: Record<string, string> = {
    daily: 'ежедневно',
    weekly: 'по дням недели',
    trigger: 'по погоде',
    one_off: 'разовое'
  };
  parts.push(`Тип: ${typeNames[parsed.type] || parsed.type}`);

  // Time
  if (parsed.time) {
    parts.push(`Время: ${parsed.time}`);
  }

  // Days
  if (parsed.days) {
    const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const dayList = parsed.days.split(',').map((d) => dayNames[parseInt(d, 10) - 1]).join(', ');
    parts.push(`Дни: ${dayList}`);
  }

  // Location
  if (parsed.locationName) {
    parts.push(`Локация: ${parsed.locationName}`);
  }

  return parts.join('\n');
}

