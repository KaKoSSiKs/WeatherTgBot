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
  <div className="space-y-2">
    {notifications.map((n) => {
      const place = locations.find((l) => l.id === n.placeId);
      return (
        <div
          key={n.id}
          className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-3"
        >
          <div className="flex-1">
            <div className="font-semibold">{n.name}</div>
            <div className="text-xs text-slate-600">
              {typeLabel[n.type]} · {n.time} · {place?.name || 'Место не выбрано'}
            </div>
            <div className="text-xs text-slate-500">Триггеры: {n.triggers.join(', ') || 'нет'}</div>
          </div>
          <label className="text-xs text-slate-600 flex items-center gap-2">
            <input type="checkbox" checked={n.enabled} onChange={(e) => onToggle(n.id, e.target.checked)} />
            {n.enabled ? 'Вкл' : 'Выкл'}
          </label>
          <button onClick={() => onEdit(n)} className="px-3 py-1 rounded-lg bg-slate-100 text-sm">
            Редактировать
          </button>
        </div>
      );
    })}
    {notifications.length === 0 && <div className="text-sm text-slate-500">Создайте первое уведомление.</div>}
  </div>
);

