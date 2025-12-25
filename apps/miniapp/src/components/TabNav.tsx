import React from 'react';

type Props = {
  route: 'locations' | 'forecast' | 'notifications' | 'settings';
  onChange: (r: Props['route']) => void;
};

const tabs: { key: Props['route']; label: string; icon: string }[] = [
  { key: 'locations', label: 'Места', icon: '📍' },
  { key: 'forecast', label: 'Прогноз', icon: '🌤️' },
  { key: 'notifications', label: 'Уведомления', icon: '⏰' },
  { key: 'settings', label: 'Настройки', icon: '⚙️' },
];

export const TabNav = ({ route, onChange }: Props) => (
  <nav className="grid grid-cols-4 gap-2 bg-white rounded-2xl p-1 shadow-sm sticky top-2 z-10">
    {tabs.map((t) => {
      const active = route === t.key;
      return (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`flex flex-col items-center justify-center py-2 rounded-xl text-sm transition ${
            active ? 'bg-slate-100 font-semibold text-slate-900' : 'text-slate-600'
          }`}
        >
          <span className="text-lg leading-none">{t.icon}</span>
          {t.label}
        </button>
      );
    })}
  </nav>
);

