import React, { useEffect, useState } from 'react';

type Props = {
  spinning: boolean;
  finalIcons: string[];
};

const ICONS = ['☀️', '🌤️', '⛅', '🌧️', '⛈️', '🌨️', '🌫️', '💨'];

export const WeatherSlotMachine = ({ spinning, finalIcons }: Props) => {
  const [current, setCurrent] = useState<string[]>(finalIcons);

  useEffect(() => {
    if (!spinning) {
      setCurrent(finalIcons);
      return;
    }
    const id = setInterval(() => {
      setCurrent([
        ICONS[Math.floor(Math.random() * ICONS.length)],
        ICONS[Math.floor(Math.random() * ICONS.length)],
        ICONS[Math.floor(Math.random() * ICONS.length)],
      ]);
    }, 120);
    return () => clearInterval(id);
  }, [spinning, finalIcons]);

  return (
    <div className="flex justify-center gap-2 my-3">
      {current.map((icon, i) => (
        <div
          key={i}
          className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-3xl select-none"
        >
          {icon}
        </div>
      ))}
    </div>
  );
};






