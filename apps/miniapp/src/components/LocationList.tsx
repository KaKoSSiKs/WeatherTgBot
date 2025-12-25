import React from 'react';
import { Location } from '../types';

type Props = {
  locations: Location[];
  onSelect: (loc: Location) => void;
  onDelete: (id: string) => void;
};

export const LocationList = ({ locations, onSelect, onDelete }: Props) => (
  <ul className="space-y-2">
    {locations.map((l) => (
      <li
        key={l.id}
        className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm flex justify-between items-center"
      >
        <div>
          <div className="font-medium">{l.name}</div>
          <div className="text-xs text-slate-500">
            {l.lat.toFixed(2)} {l.lon.toFixed(2)} {l.country ? `· ${l.country}` : ''}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onSelect(l)} className="px-3 py-1 rounded-lg bg-slate-100">
            Открыть
          </button>
          <button onClick={() => onDelete(l.id)} className="px-3 py-1 rounded-lg text-red-600">
            Удалить
          </button>
        </div>
      </li>
    ))}
    {locations.length === 0 && <li className="text-sm text-slate-500">Добавьте город или включите геолокацию.</li>}
  </ul>
);

