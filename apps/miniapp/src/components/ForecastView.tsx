import React from 'react';
import { Forecast } from '../types';
import { formatPressure, formatTemp, formatWind } from '../utils/format';

type Props = {
  data: Forecast;
  units: 'metric' | 'imperial';
  onCreateAlert: () => void;
};

export const ForecastView = ({ data, units, onCreateAlert }: Props) => (
  <div className="space-y-4">
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Прогноз — {data.place.name}</h2>
          <div className="text-sm text-slate-600">
            Восход {data.now.sunrise} · Закат {data.now.sunset}
          </div>
        </div>
        <button onClick={onCreateAlert} className="text-sm px-3 py-2 rounded-xl bg-slate-100">
          ➕ Уведомление
        </button>
      </div>
      <div className="mt-3 flex items-center gap-4">
        <div className="text-4xl font-bold">{formatTemp(data.now.temp, units)}</div>
        <div>
          <div className="text-slate-700">
            {data.now.condition} · ощущается {formatTemp(data.now.feels, units)}
          </div>
          <div className="text-sm text-slate-600">
            Ветер {formatWind(data.now.wind, units)} · Влажн {data.now.humidity}% · Давл {formatPressure(data.now.pressure)}
          </div>
          <div className="text-xs text-green-700 mt-1">Совет: лёгкая куртка, без зонта.</div>
        </div>
      </div>
    </div>

    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
      <div className="font-semibold mb-2">Почасовой</div>
      <div className="flex overflow-x-auto gap-2 pb-2">
        {data.hours.map((h) => (
          <div
            key={h.h}
            className="min-w-[70px] p-3 bg-slate-50 rounded-xl text-center text-sm border border-slate-100"
          >
            <div className="text-xs text-slate-500">{h.h}:00</div>
            <div className="text-lg">{h.icon ?? '🌤️'}</div>
            <div className="font-semibold">{formatTemp(h.temp, units)}</div>
            <div className="text-xs text-slate-500">{formatWind(h.wind ?? 0, units)}</div>
          </div>
        ))}
      </div>
    </div>

    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
      <div className="font-semibold mb-2">7 дней</div>
      <div className="space-y-2">
        {data.days.map((d) => (
          <div key={d.date} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="text-xl">{d.icon ?? '⛅'}</div>
              <div>
                <div className="font-medium">{d.date}</div>
                <div className="text-xs text-slate-500">Осадки {d.rainChance ?? 0}%</div>
              </div>
            </div>
            <div className="font-semibold">
              {formatTemp(d.min, units)} / {formatTemp(d.max, units)}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

