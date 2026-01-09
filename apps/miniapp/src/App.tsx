import React, { useEffect, useMemo, useState } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { TabNav } from './components/TabNav';
import { LocationsPage } from './pages/LocationsPage';
import { ForecastPage } from './pages/ForecastPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { SettingsPage } from './pages/SettingsPage';
import { loadInitData } from './services/telegram';
import {
  addLocation,
  deleteLocation,
  fetchForecast,
  fetchLocations,
  fetchNotifications,
  saveNotification,
  toggleNotification,
} from './services/api';
import { Location, Notification, Settings } from './types';

type Route = 'locations' | 'forecast' | 'notifications' | 'settings';

const defaultSettings: Settings = { units: 'metric', locale: 'ru', cityCount: 5 };

export function App() {
  const [route, setRoute] = useState<Route>('locations');
  const [initData, setInitData] = useState<string | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selected, setSelected] = useState<Location | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const init = loadInitData();
    setInitData(init);
    (async () => {
      const locs = await fetchLocations();
      setLocations(locs);
      setSelected(locs[0] ?? null);
      const nots = await fetchNotifications();
      setNotifications(nots);
    })();
  }, []);

  const currentForecast = useMemo(() => selected, [selected]);

  const handleAddLocation = async (loc: Omit<Location, 'id'>) => {
    const updated = await addLocation(loc);
    setLocations(updated);
    setSelected(updated[0] ?? null);
  };

  const handleDeleteLocation = async (id: string) => {
    const updated = await deleteLocation(id);
    setLocations(updated);
    if (selected?.id === id) setSelected(updated[0] ?? null);
  };

  const handleSaveNotification = async (notif: Notification) => {
    const updated = await saveNotification(notif);
    setNotifications(updated);
  };

  const handleToggleNotification = async (id: string, enabled: boolean) => {
    const updated = await toggleNotification(id, enabled);
    setNotifications(updated);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-blue-50 text-slate-900">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 pb-20 sm:pb-8">
        <Header initData={!!initData} onOpenBot={() => window.open('https://t.me/your_bot?start=miniapp', '_blank')} />
        <TabNav route={route} onChange={setRoute} />

        <div className="mt-4">
          {route === 'locations' && (
            <LocationsPage
              locations={locations}
              onAdd={handleAddLocation}
              onDelete={handleDeleteLocation}
              onSelect={(loc) => {
                setSelected(loc);
                setRoute('forecast');
              }}
            />
          )}

          {route === 'forecast' && (
            <ForecastPage
              location={selected}
              fetchForecast={(loc) => {
                setIsLoading(true);
                return fetchForecast(loc).finally(() => setIsLoading(false));
              }}
              isLoading={isLoading}
              onCreateAlert={() => setRoute('notifications')}
            />
          )}

          {route === 'notifications' && (
            <NotificationsPage
              locations={locations}
              notifications={notifications}
              onSave={handleSaveNotification}
              onToggle={handleToggleNotification}
              onBackToForecast={() => setRoute('forecast')}
            />
          )}

          {route === 'settings' && (
            <SettingsPage
              settings={settings}
              onChange={(next) => setSettings(next)}
              onLocaleChange={(locale) => setSettings({ ...settings, locale })}
            />
          )}
        </div>

        <Footer />
      </div>
    </div>
  );
}
