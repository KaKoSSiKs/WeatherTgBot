import React from 'react';
import { Forecast } from '../types';
import { formatPressure, formatTemp, formatWind } from '../utils/format';

type Props = {
  data: Forecast;
  units: 'metric' | 'imperial';
  onCreateAlert: () => void;
};

export const ForecastView = ({ data, units, onCreateAlert }: Props) => (
  <div className="space-y-3 sm:space-y-4">
    <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-md border border-slate-200">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <div className="flex-1">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">🌤️ {data.place.name}</h2>
          <div className="text-xs sm:text-sm text-slate-600 mt-1">
            🌅 {data.now.sunrise} · 🌇 {data.now.sunset}
          </div>
        </div>
        <button 
          onClick={onCreateAlert} 
          className="text-xs sm:text-sm px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white shadow-sm active:scale-95 transition-all font-medium whitespace-nowrap"
        >
          ➕ Уведомление
        </button>
      </div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="text-5xl sm:text-6xl font-bold text-slate-900">{formatTemp(data.now.temp, units)}</div>
        <div className="flex-1 min-w-0">
          <div className="text-base sm:text-lg text-slate-700 font-medium mb-1">
            {data.now.condition}
          </div>
          <div className="text-xs sm:text-sm text-slate-600 space-y-1">
            <div>Ощущается {formatTemp(data.now.feels, units)}</div>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              <span>💨 {formatWind(data.now.wind, units)}</span>
              <span>💧 {data.now.humidity}%</span>
              <span>📊 {formatPressure(data.now.pressure)}</span>
            </div>
          </div>
          <div className="text-xs text-green-700 mt-2 bg-green-50 px-2 py-1 rounded-lg inline-block">
            💡 Совет: лёгкая куртка, без зонта
          </div>
        </div>
      </div>
    </div>

    <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-md border border-slate-200">
      <div className="font-semibold text-base sm:text-lg mb-3 text-slate-900">⏰ Почасовой прогноз</div>
      <div className="flex overflow-x-auto gap-2 sm:gap-3 pb-2 -mx-1 px-1 scrollbar-hide">
        {data.hours.map((h) => (
          <div
            key={h.h}
            className="min-w-[75px] sm:min-w-[85px] p-3 bg-gradient-to-br from-blue-50 to-slate-50 rounded-xl text-center text-sm border border-slate-200 shadow-sm flex-shrink-0"
          >
            <div className="text-xs text-slate-600 font-medium mb-1">{h.h}:00</div>
            <div className="text-2xl sm:text-3xl mb-1">{h.icon ?? '🌤️'}</div>
            <div className="font-bold text-slate-900 text-base">{formatTemp(h.temp, units)}</div>
            <div className="text-xs text-slate-500 mt-1">💨 {formatWind(h.wind ?? 0, units)}</div>
          </div>
        ))}
      </div>
    </div>

    <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-md border border-slate-200">
      <div className="font-semibold text-base sm:text-lg mb-3 text-slate-900">📅 Прогноз на 7 дней</div>
      <div className="space-y-2">
        {data.days.map((d) => (
          <div key={d.date} className="flex items-center justify-between p-3 sm:p-4 rounded-xl bg-gradient-to-r from-slate-50 to-blue-50 border border-slate-200 hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
              <div className="text-2xl sm:text-3xl flex-shrink-0">{d.icon ?? '⛅'}</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm sm:text-base text-slate-900 truncate">
                  {new Date(d.date).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' })}
                </div>
                <div className="text-xs text-slate-600 mt-0.5">🌧️ Осадки {d.rainChance ?? 0}%</div>
              </div>
            </div>
            <div className="font-bold text-base sm:text-lg text-slate-900 flex-shrink-0 ml-2">
              {formatTemp(d.min, units)} / {formatTemp(d.max, units)}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

