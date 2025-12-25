export type Location = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  country?: string;
};

export type ForecastHour = {
  h: number;
  temp: number;
  icon?: string;
  wind?: number;
};

export type ForecastDay = {
  date: string;
  min: number;
  max: number;
  icon?: string;
  rainChance?: number;
};

export type Forecast = {
  place: Location;
  now: {
    temp: number;
    feels: number;
    condition: string;
    wind: number;
    humidity: number;
    pressure: number;
    uvi: number;
    sunrise: string;
    sunset: string;
  };
  hours: ForecastHour[];
  days: ForecastDay[];
};

export type Notification = {
  id: string;
  name: string;
  enabled: boolean;
  type: 'daily' | 'once' | 'weekdays';
  time: string;
  placeId: string;
  triggers: string[];
};

export type Settings = {
  units: 'metric' | 'imperial';
  locale: 'ru' | 'en';
  cityCount: number;
};

