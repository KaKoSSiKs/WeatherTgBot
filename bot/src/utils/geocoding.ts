import type { Coordinates } from '../weather/provider';

export type GeocodedLocation = Coordinates & { name: string; aliases: string[] };

const CITY_COORDINATES: GeocodedLocation[] = [
  {
    name: 'Москва',
    aliases: ['москва', 'moscow', 'moskva'],
    latitude: 55.7558,
    longitude: 37.6173
  },
  {
    name: 'Санкт-Петербург',
    aliases: ['санкт-петербург', 'питер', 'spb', 'saint petersburg', 'st petersburg'],
    latitude: 59.9343,
    longitude: 30.3351
  },
  {
    name: 'Лондон',
    aliases: ['лондон', 'london'],
    latitude: 51.5072,
    longitude: -0.1276
  },
  {
    name: 'Нью-Йорк',
    aliases: ['нью-йорк', 'new york', 'nyc', 'newyork'],
    latitude: 40.7128,
    longitude: -74.006
  }
];

const locationCache = new Map<string, GeocodedLocation>();

function normalize(query: string): string {
  return query.trim().toLowerCase();
}

export function geocodeCity(query: string): GeocodedLocation | null {
  const normalized = normalize(query);
  if (!normalized) {
    return null;
  }

  if (locationCache.has(normalized)) {
    return locationCache.get(normalized)!;
  }

  const result = CITY_COORDINATES.find((city) =>
    city.aliases.includes(normalized)
  );

  if (result) {
    locationCache.set(normalized, result);
    return result;
  }

  return null;
}

export function rememberCity(query: string, location: GeocodedLocation): void {
  const normalized = normalize(query);
  locationCache.set(normalized, location);
}

export function getLocationCacheSnapshot() {
  return {
    size: locationCache.size,
    keys: Array.from(locationCache.keys())
  };
}

export const DEFAULT_CITY = CITY_COORDINATES[0];


