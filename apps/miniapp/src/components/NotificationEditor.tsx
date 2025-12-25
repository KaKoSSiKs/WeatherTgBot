import React, { useMemo, useState } from 'react';
import { Location, Notification } from '../types';

type Props = {
  value?: Notification | null;
  locations: Location[];
  onClose: () => void;
  onSave: (n: Notification) => void;
};

export const NotificationEditor = ({ value, locations, onClose, onSave }: Props) => {
  const [draft, setDraft] = useState<Notification>(
    value ?? {
      id: crypto.randomUUID(),
      name: 'Новое уведомление',
      enabled: true,
      type: 'daily',
      time: '08:00',
      placeId: locations[0]?.id || '',
      triggers: [],
    }
  );

  const placeOptions = useMemo(
    () => locations.map((l) => ({ label: l.name, value: l.id })),
    [locations]
  );

  if (!locations.length) {
    return (
      <div className="p-4 text-sm text-slate-600">
        Добавьте место, чтобы создавать уведомления.
        <button className="ml-2 text-primary" onClick={onClose}>
          Закрыть
        </button>
      </div>
    );
  }

  const updateTrigger = (trigger: string) => {
    setDraft((d) => ({ ...d, triggers: [...new Set([...(d.triggers ?? []), trigger])] }));
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center p-4 z-20">
      <div className="w-full md:w-[480px] bg-white rounded-2xl p-4 shadow-lg">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold">Уведомление</h3>
          <button onClick={onClose} className="text-sm text-slate-500">
            Закрыть
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <input
            className="p-3 border border-slate-200 rounded-xl"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={draft.enabled}
              onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
            />
            Включено
          </label>

          <div className="grid grid-cols-2 gap-2">
            <select
              className="p-3 border border-slate-200 rounded-xl"
              value={draft.type}
              onChange={(e) => setDraft({ ...draft, type: e.target.value as Notification['type'] })}
            >
              <option value="daily">Ежедневно</option>
              <option value="once">Разово</option>
              <option value="weekdays">По дням</option>
            </select>
            <input
              type="time"
              className="p-3 border border-slate-200 rounded-xl"
              value={draft.time}
              onChange={(e) => setDraft({ ...draft, time: e.target.value })}
            />
          </div>

          <select
            className="p-3 border border-slate-200 rounded-xl"
            value={draft.placeId}
            onChange={(e) => setDraft({ ...draft, placeId: e.target.value })}
          >
            {placeOptions.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>

          <div>
            <div className="text-sm text-slate-600 mb-2">Триггеры</div>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'temp_drop', label: 'Похолодание' },
                { key: 'temp_rise', label: 'Потепление' },
                { key: 'wind_strong', label: 'Сильный ветер' },
                { key: 'rain', label: 'Дождь' },
                { key: 'snow', label: 'Снег' },
                { key: 'extreme', label: 'Экстремально' },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => updateTrigger(t.key)}
                  className={`px-3 py-2 rounded-xl border ${
                    draft.triggers.includes(t.key) ? 'border-primary text-primary bg-blue-50' : 'border-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-100">
            Отмена
          </button>
          <button
            onClick={() => onSave(draft)}
            className="px-4 py-2 rounded-xl bg-primary text-white shadow-sm active:scale-[0.98]"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
};

