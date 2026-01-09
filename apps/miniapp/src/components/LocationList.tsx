import React from 'react';
import { Location } from '../types';

type Props = {
  locations: Location[];
  onSelect: (loc: Location) => void;
  onDelete: (id: string) => void;
};

export const LocationList = ({ locations, onSelect, onDelete }: Props) => (
  <ul className="space-y-2 sm:space-y-3">
    {locations.map((l) => (
      <li
        key={l.id}
        className="p-4 bg-white rounded-2xl border border-slate-200 shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:shadow-lg transition-shadow"
      >
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-base sm:text-lg text-slate-900 flex items-center gap-2">
            <span className="text-xl">📍</span>
            {l.name}
          </div>
          <div className="text-xs sm:text-sm text-slate-600 mt-1">
            {l.country && <span className="mr-2">🌍 {l.country}</span>}
            <span className="text-slate-400">{l.lat.toFixed(2)}, {l.lon.toFixed(2)}</span>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={() => onSelect(l)} 
            className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium shadow-sm active:scale-95 transition-all"
          >
            Открыть
          </button>
          <button 
            onClick={() => onDelete(l.id)} 
            className="px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium border border-red-200 active:scale-95 transition-all"
          >
            🗑️
          </button>
        </div>
      </li>
    ))}
    {locations.length === 0 && (
      <li className="p-6 text-center bg-white rounded-2xl border border-slate-200">
        <div className="text-4xl mb-2">📍</div>
        <div className="text-sm sm:text-base text-slate-600">Добавьте город или включите геолокацию</div>
      </li>
    )}
  </ul>
);

