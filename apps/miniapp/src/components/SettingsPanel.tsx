import React from 'react';
import { Settings } from '../types';

type Props = {
  settings: Settings;
  onChange: (s: Settings) => void;
};

export const SettingsPanel = ({ settings, onChange }: Props) => (
  <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-4">
    <div className="flex items-center justify-between">
      <div className="text-sm text-slate-700">Единицы</div>
      <select
        className="p-2 border border-slate-200 rounded-lg"
        value={settings.units}
        onChange={(e) => onChange({ ...settings, units: e.target.value as Settings['units'] })}
      >
        <option value="metric">Celsius / м/с</option>
        <option value="imperial">Fahrenheit / mph</option>
      </select>
    </div>

    <div className="flex items-center justify-between">
      <div className="text-sm text-slate-700">Язык</div>
      <select
        className="p-2 border border-slate-200 rounded-lg"
        value={settings.locale}
        onChange={(e) => onChange({ ...settings, locale: e.target.value as Settings['locale'] })}
      >
        <option value="ru">Русский</option>
        <option value="en">English</option>
      </select>
    </div>

    <div className="flex items-center justify-between">
      <div className="text-sm text-slate-700">Макс. мест</div>
      <input
        type="number"
        className="w-24 p-2 border border-slate-200 rounded-lg"
        value={settings.cityCount}
        onChange={(e) => onChange({ ...settings, cityCount: Number(e.target.value) })}
      />
    </div>

    <div className="text-xs text-slate-500">
      Smart alerts, UVI, рекомендации по одежде — фронт отображает, бэкенд считает триггеры и шлёт через бота или push.
    </div>
  </div>
);

