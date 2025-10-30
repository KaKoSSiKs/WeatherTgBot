import axios from 'axios';
import { appConfig } from '../config';

export type Coordinates = { latitude: number; longitude: number };

export type WeatherCurrent = {
  temperature: number; // C or F based on units
  feelsLike: number;
  conditions: string; // e.g. Clear, Rain
  windSpeed: number; // m/s or mph
  windDeg: number; // degrees
  pressure: number; // hPa
  humidity: number; // %
  uvIndex?: number;
  sunrise?: number; // epoch seconds
  sunset?: number; // epoch seconds
};

export interface WeatherProvider {
  getCurrentByCoords(coords: Coordinates): Promise<WeatherCurrent>;
}

class OpenWeatherProvider implements WeatherProvider {
  async getCurrentByCoords(coords: Coordinates): Promise<WeatherCurrent> {
    const url = 'https://api.openweathermap.org/data/2.5/weather';
    const { data } = await axios.get(url, {
      params: {
        lat: coords.latitude,
        lon: coords.longitude,
        appid: appConfig.WEATHER_API_KEY,
        units: appConfig.WEATHER_UNITS,
        lang: appConfig.WEATHER_API_LANG
      }
    });

    return {
      temperature: data.main.temp,
      feelsLike: data.main.feels_like,
      conditions: data.weather?.[0]?.description ?? 'n/a',
      windSpeed: data.wind?.speed ?? 0,
      windDeg: data.wind?.deg ?? 0,
      pressure: data.main.pressure,
      humidity: data.main.humidity,
      sunrise: data.sys?.sunrise,
      sunset: data.sys?.sunset
    };
  }
}

export function getWeatherProvider(): WeatherProvider {
  switch (appConfig.WEATHER_API_PROVIDER) {
    case 'openweathermap':
    default:
      return new OpenWeatherProvider();
  }
}
