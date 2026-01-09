import { Forecast, Location, Notification } from '../types';
import { loadInitData } from './telegram';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Получить заголовки с аутентификацией
 */
async function getHeaders(): Promise<HeadersInit> {
  const initData = loadInitData();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (initData) {
    headers['X-Telegram-Init-Data'] = initData;
  }
  
  return headers;
}

/**
 * Обработка ошибок API
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  return response.json();
}

/**
 * GET /api/locations - получить все локации
 */
export const fetchLocations = async (): Promise<Location[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/locations`, {
      headers: await getHeaders(),
    });
    return handleResponse<Location[]>(response);
  } catch (error) {
    console.error('Error fetching locations:', error);
    return [];
  }
};

/**
 * POST /api/locations - добавить локацию
 */
export const addLocation = async (loc: Omit<Location, 'id'>): Promise<Location[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/locations`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(loc),
    });
    await handleResponse(response);
    return fetchLocations();
  } catch (error) {
    console.error('Error adding location:', error);
    throw error;
  }
};

/**
 * DELETE /api/locations/:id - удалить локацию
 */
export const deleteLocation = async (id: string): Promise<Location[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/locations/${id}`, {
      method: 'DELETE',
      headers: await getHeaders(),
    });
    await handleResponse(response);
    return fetchLocations();
  } catch (error) {
    console.error('Error deleting location:', error);
    throw error;
  }
};

/**
 * GET /api/notifications - получить все уведомления
 */
export const fetchNotifications = async (): Promise<Notification[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/notifications`, {
      headers: await getHeaders(),
    });
    return handleResponse<Notification[]>(response);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
};

/**
 * POST /api/notifications - создать уведомление
 */
export const saveNotification = async (notif: Notification): Promise<Notification[]> => {
  try {
    const method = notif.id.startsWith('notif-') ? 'POST' : 'PUT';
    const url = notif.id.startsWith('notif-') 
      ? `${API_BASE_URL}/api/notifications`
      : `${API_BASE_URL}/api/notifications/${notif.id}`;
    
    const response = await fetch(url, {
      method,
      headers: await getHeaders(),
      body: JSON.stringify({
        name: notif.name,
        type: notif.type,
        time: notif.time,
        placeId: notif.placeId,
        triggers: notif.triggers,
      }),
    });
    await handleResponse(response);
    return fetchNotifications();
  } catch (error) {
    console.error('Error saving notification:', error);
    throw error;
  }
};

/**
 * PATCH /api/notifications/:id/toggle - включить/выключить уведомление
 */
export const toggleNotification = async (id: string, enabled: boolean): Promise<Notification[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/notifications/${id}/toggle`, {
      method: 'PATCH',
      headers: await getHeaders(),
      body: JSON.stringify({ enabled }),
    });
    await handleResponse(response);
    return fetchNotifications();
  } catch (error) {
    console.error('Error toggling notification:', error);
    throw error;
  }
};

/**
 * GET /api/weather/forecast - получить прогноз погоды
 */
export const fetchForecast = async (place: Location): Promise<Forecast> => {
  try {
    const params = new URLSearchParams({
      locationId: place.id,
      days: '7',
    });
    
    const response = await fetch(`${API_BASE_URL}/api/weather/forecast?${params}`, {
      headers: await getHeaders(),
    });
    
    const data = await handleResponse<any>(response);
    
    // Получаем текущую погоду
    const currentResponse = await fetch(`${API_BASE_URL}/api/weather/current?locationId=${place.id}`, {
      headers: await getHeaders(),
    });
    const currentData = await handleResponse<any>(currentResponse);
    
    return {
      place: data.place || place,
      now: currentData.now || {
        temp: 0,
        feels: 0,
        condition: 'Неизвестно',
        wind: 0,
        humidity: 0,
        pressure: 0,
        uvi: 0,
      },
      hours: data.hours || [],
      days: data.days || [],
    };
  } catch (error) {
    console.error('Error fetching forecast:', error);
    // Возвращаем мок данные в случае ошибки
    return {
      place,
      now: {
        temp: 0,
        feels: 0,
        condition: 'Ошибка загрузки',
        wind: 0,
        humidity: 0,
        pressure: 0,
        uvi: 0,
      },
      hours: [],
      days: [],
    };
  }
};
