import React from 'react';
import { Location } from '../types';
import { LocationList } from '../components/LocationList';
import { LocationSearch } from '../components/LocationSearch';

type Props = {
  locations: Location[];
  onAdd: (loc: Omit<Location, 'id'>) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
  onSelect: (loc: Location) => void;
};

export const LocationsPage = ({ locations, onAdd, onDelete, onSelect }: Props) => (
  <div className="p-1">
    <h2 className="text-xl font-semibold mb-2">Места</h2>
    <LocationSearch
      onAdd={onAdd}
      onGeo={(loc) => {
        onAdd(loc);
      }}
    />
    <LocationList locations={locations} onSelect={onSelect} onDelete={onDelete} />
  </div>
);

