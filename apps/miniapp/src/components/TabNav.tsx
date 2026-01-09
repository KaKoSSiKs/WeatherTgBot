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
  <nav className="grid grid-cols-4 gap-1 bg-white rounded-2xl p-1 shadow-md sticky top-2 z-10 mb-4 border border-slate-100">
    {tabs.map((t) => {
      const active = route === t.key;
      return (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl text-xs sm:text-sm transition-all duration-200 ${
            active 
              ? 'bg-blue-50 text-blue-600 font-semibold shadow-sm' 
              : 'text-slate-600 hover:text-slate-900 active:bg-slate-50'
          }`}
        >
          <span className="text-xl sm:text-2xl leading-none mb-0.5">{t.icon}</span>
          <span className="leading-tight">{t.label}</span>
        </button>
      );
    })}
  </nav>
);

