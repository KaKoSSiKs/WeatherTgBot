import React from 'react';
import { Notification, Location } from '../types';

type Props = {
  notifications: Notification[];
  locations: Location[];
  onEdit: (n: Notification) => void;
  onToggle: (id: string, enabled: boolean) => void;
};

const typeLabel: Record<Notification['type'], string> = {
  daily: 'Ежедневно',
  once: 'Разово',
  weekdays: 'По дням',
};

export const NotificationList = ({ notifications, locations, onEdit, onToggle }: Props) => (
  <div className="space-y-3">
    {notifications.map((n) => {
      const place = locations.find((l) => l.id === n.placeId);
      return (
        <div
          key={n.id}
          className="p-4 bg-white rounded-2xl border border-slate-200 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:shadow-lg transition-shadow"
        >
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-base sm:text-lg text-slate-900 flex items-center gap-2">
              <span className="text-xl">🔔</span>
              {n.name}
            </div>
            <div className="text-xs sm:text-sm text-slate-600 mt-1 space-y-1">
              <div>{typeLabel[n.type]} · ⏰ {n.time} · 📍 {place?.name || 'Место не выбрано'}</div>
              {n.triggers.length > 0 && (
                <div className="text-xs text-slate-500">
                  Триггеры: {n.triggers.map(t => {
                    const labels: Record<string, string> = {
                      temp_drop: '📉 Похолодание',
                      temp_rise: '📈 Потепление',
                      rain: '🌧️ Дождь'
                    };
                    return labels[t] || t;
                  }).join(', ')}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
              <input 
                type="checkbox" 
                checked={n.enabled} 
                onChange={(e) => onToggle(n.id, e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-xs sm:text-sm font-medium text-slate-700">
                {n.enabled ? '✅ Вкл' : '⏸️ Выкл'}
              </span>
            </label>
            <button 
              onClick={() => onEdit(n)} 
              className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs sm:text-sm font-medium shadow-sm active:scale-95 transition-all"
            >
              ✏️
            </button>
          </div>
        </div>
      );
    })}
    {notifications.length === 0 && (
      <div className="p-6 text-center bg-white rounded-2xl border border-slate-200">
        <div className="text-4xl mb-2">🔔</div>
        <div className="text-sm sm:text-base text-slate-600">Создайте первое уведомление</div>
      </div>
    )}
  </div>
);

