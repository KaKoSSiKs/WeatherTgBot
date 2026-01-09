import React, { useState } from 'react';
import { Location } from '../types';

type Props = {
  onAdd: (loc: Omit<Location, 'id'>) => Promise<void> | void;
  onGeo?: (loc: Omit<Location, 'id'>) => Promise<void> | void;
};

export const LocationSearch = ({ onAdd, onGeo }: Props) => {
  const [query, setQuery] = useState('');

  const handleAdd = () => {
    if (!query.trim()) return;
    onAdd({ name: query.trim(), lat: 0, lon: 0 });
    setQuery('');
  };

  const handleGeo = () => {
    if (!navigator.geolocation || !onGeo) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => onGeo({ name: 'Моё местоположение', lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (e) => console.warn('geo error', e)
    );
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2 mb-4">
      <input
        className="flex-1 p-3 sm:p-4 border-2 border-slate-200 rounded-xl bg-white shadow-sm focus:border-blue-500 focus:outline-none transition-colors text-sm sm:text-base"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
        placeholder="🔍 Поиск города..."
      />
      <div className="flex gap-2">
        <button 
          className="flex-1 sm:flex-none px-4 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium shadow-md active:scale-95 transition-all" 
          onClick={handleAdd}
        >
          ➕ Добавить
        </button>
        {onGeo && (
          <button 
            className="px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium shadow-sm active:scale-95 transition-all" 
            onClick={handleGeo}
          >
            📍 Гео
          </button>
        )}
      </div>
    </div>
  );
};

