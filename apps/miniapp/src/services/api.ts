import { Forecast, Location, Notification } from '../types';

const storage = {
  get<T>(key: string, fallback: T): T {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },
  set<T>(key: string, value: T) {
    localStorage.setItem(key, JSON.stringify(value));
  },
};

const defaultLocations: Location[] = [
  { id: 'loc-moscow', name: 'Москва', lat: 55.75, lon: 37.61, country: 'RU' },
  { id: 'loc-spb', name: 'Санкт‑Петербург', lat: 59.94, lon: 30.31, country: 'RU' },
];

const defaultNotifications: Notification[] = [
  { id: 'notif-1', name: 'Ежедневно 08:00', enabled: true, type: 'daily', time: '08:00', placeId: 'loc-moscow', triggers: ['temp_drop'] },
  { id: 'notif-2', name: 'Если дождь завтра', enabled: true, type: 'once', time: '07:00', placeId: 'loc-spb', triggers: ['rain'] },
];

export const fetchLocations = async (): Promise<Location[]> => storage.get<Location[]>('locs', defaultLocations);

export const addLocation = async (loc: Omit<Location, 'id'>): Promise<Location[]> => {
  const current = storage.get<Location[]>('locs', []);
  const next = [{ ...loc, id: crypto.randomUUID() }, ...current];
  storage.set('locs', next);
  return next;
};

export const deleteLocation = async (id: string): Promise<Location[]> => {
  const current = storage.get<Location[]>('locs', []);
  const next = current.filter((l) => l.id !== id);
  storage.set('locs', next);
  return next;
};

export const fetchNotifications = async (): Promise<Notification[]> =>
  storage.get<Notification[]>('notifs', defaultNotifications);

export const saveNotification = async (notif: Notification): Promise<Notification[]> => {
  const current = storage.get<Notification[]>('notifs', []);
  const next = [...current.filter((n) => n.id !== notif.id), notif];
  storage.set('notifs', next);
  return next;
};

export const toggleNotification = async (id: string, enabled: boolean): Promise<Notification[]> => {
  const current = storage.get<Notification[]>('notifs', []);
  const next = current.map((n) => (n.id === id ? { ...n, enabled } : n));
  storage.set('notifs', next);
  return next;
};

// Mock forecast; replace with backend call to /api/forecast
export const fetchForecast = async (place: Location): Promise<Forecast> => {
  const hours = Array.from({ length: 24 }).map((_, i) => ({
    h: i,
    temp: 10 + Math.sin(i / 3) * 6,
    icon: i < 6 ? '🌙' : i < 12 ? '🌤️' : i < 18 ? '☀️' : '⛅',
    wind: 2 + i * 0.2,
  }));

  const days = Array.from({ length: 7 }).map((_, i) => ({
    date: new Date(Date.now() + i * 86400000).toISOString().slice(0, 10),
    min: 8 + i,
    max: 14 + i,
    icon: i % 2 === 0 ? '🌤️' : '🌧️',
    rainChance: 10 + i * 8,
  }));

  return {
    place,
    now: {
      temp: 12,
      feels: 11,
      condition: 'Облачно',
      wind: 4,
      humidity: 73,
      pressure: 1012,
      uvi: 2,
      sunrise: '07:45',
      sunset: '16:30',
    },
    hours,
    days,
  };
};

/*
API контракт (ожидаемый backend):
GET /api/locations -> Location[]
POST /api/locations {name,lat,lon,country?} -> Location
DELETE /api/locations/:id -> 204

GET /api/forecast?lat&lon&units=metric|imperial -> Forecast

GET /api/notifications -> Notification[]
POST /api/notifications -> create
PUT /api/notifications/:id -> update
PATCH /api/notifications/:id/toggle {enabled:boolean}
DELETE /api/notifications/:id

POST /api/bot/sendAction {action,payload,initData} -> 200 (использовать для команд боту из mini-app)
*/

