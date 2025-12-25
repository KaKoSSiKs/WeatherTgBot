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
    <div className="flex gap-2 mb-3">
      <input
        className="flex-1 p-3 border border-slate-200 rounded-xl bg-white shadow-sm"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Поиск города или координаты"
      />
      <button className="px-3 py-2 rounded-xl bg-slate-100" onClick={handleAdd}>
        Добавить
      </button>
      <button className="px-3 py-2 rounded-xl bg-slate-100" onClick={handleGeo}>
        Гео
      </button>
    </div>
  );
};

