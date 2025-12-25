import React, { useState } from 'react';
import { Location, Notification } from '../types';
import { NotificationList } from '../components/NotificationList';
import { NotificationEditor } from '../components/NotificationEditor';

type Props = {
  locations: Location[];
  notifications: Notification[];
  onSave: (n: Notification) => Promise<void> | void;
  onToggle: (id: string, enabled: boolean) => Promise<void> | void;
  onBackToForecast: () => void;
};

export const NotificationsPage = ({ locations, notifications, onSave, onToggle, onBackToForecast }: Props) => {
  const [editing, setEditing] = useState<Notification | null | undefined>(undefined);

  return (
    <div className="p-1 space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Уведомления</h2>
        <button onClick={onBackToForecast} className="text-sm text-primary">
          К прогнозу
        </button>
      </div>

      <button
        className="px-4 py-2 rounded-xl bg-primary text-white shadow-sm"
        onClick={() => setEditing(null)}
      >
        Создать
      </button>

      <NotificationList notifications={notifications} locations={locations} onEdit={setEditing} onToggle={onToggle} />

      {editing !== undefined && (
        <NotificationEditor
          value={editing}
          locations={locations}
          onClose={() => setEditing(undefined)}
          onSave={(n) => {
            onSave(n);
            setEditing(undefined);
          }}
        />
      )}
    </div>
  );
};

