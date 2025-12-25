import React from 'react';
import { Settings } from '../types';
import { SettingsPanel } from '../components/SettingsPanel';

type Props = {
  settings: Settings;
  onChange: (s: Settings) => void;
  onLocaleChange: (locale: Settings['locale']) => void;
};

export const SettingsPage = ({ settings, onChange, onLocaleChange }: Props) => (
  <div className="p-1 space-y-3">
    <h2 className="text-xl font-semibold">Настройки</h2>
    <SettingsPanel
      settings={settings}
      onChange={(next) => {
        onChange(next);
        onLocaleChange(next.locale);
      }}
    />
  </div>
);

