export const formatTemp = (t: number, units: 'metric' | 'imperial') =>
  units === 'metric' ? `${Math.round(t)}°C` : `${Math.round(t)}°F`;

export const formatWind = (v: number, units: 'metric' | 'imperial') =>
  units === 'metric' ? `${v.toFixed(0)} м/с` : `${(v * 2.237).toFixed(0)} mph`;

export const formatPressure = (p: number) => `${p} гПа`;

