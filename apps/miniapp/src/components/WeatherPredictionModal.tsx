import React, { useMemo, useState } from 'react';
import { WeatherSlotMachine } from './WeatherSlotMachine';

type Prediction = { day: string; temp: number; icon: string };

type Props = {
  onClose: () => void;
};

const DAY_LABELS = ['День 1', 'День 2', 'День 3'];
const ICONS = ['☀️', '🌤️', '⛅', '🌧️', '⛈️', '🌨️', '🌫️', '💨'];

const phraseByTemp = (avg: number) => {
  if (avg < -5) return 'Очень холодно — будто в арктической экспедиции!';
  if (avg < 8) return 'Прохладно — не забудь кофту.';
  if (avg < 20) return 'Тепло — самое время гулять.';
  return 'Жарко — расплавишься, как сыр на тосте!';
};

export const WeatherPredictionModal = ({ onClose }: Props) => {
  const [spinning, setSpinning] = useState(false);
  const [predictions, setPredictions] = useState<Prediction[]>(
    DAY_LABELS.map((d) => ({ day: d, temp: 12, icon: '🌤️' }))
  );

  const avgTemp = useMemo(
    () => Math.round(predictions.reduce((s, p) => s + p.temp, 0) / predictions.length),
    [predictions]
  );

  const finalIcons = predictions.map((p) => p.icon);

  const roll = () => {
    setSpinning(true);
    setTimeout(() => {
      const next = DAY_LABELS.map((d) => ({
        day: d,
        temp: Math.round(-10 + Math.random() * 45), // -10..35
        icon: ICONS[Math.floor(Math.random() * ICONS.length)],
      }));
      setPredictions(next);
      setSpinning(false);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center p-4">
      <div className="w-full md:w-[480px] bg-white rounded-2xl p-5 shadow-xl">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">Предсказание погоды</h3>
          <button className="text-slate-500 text-sm" onClick={onClose}>
            Закрыть
          </button>
        </div>

        <p className="text-sm text-slate-600">
          Крути слоты и получи случайный прогноз на 3 дня. Чисто ради фана.
        </p>

        <WeatherSlotMachine spinning={spinning} finalIcons={finalIcons} />

        <button
          onClick={roll}
          className="w-full mt-2 px-4 py-3 rounded-xl bg-primary text-white font-semibold shadow-sm active:scale-[0.98]"
          disabled={spinning}
        >
          {spinning ? 'Крутится...' : 'Крутить'}
        </button>

        <div className="mt-4 space-y-2">
          {predictions.map((p) => (
            <div
              key={p.day}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{p.icon}</span>
                <div>
                  <div className="font-semibold">{p.day}</div>
                  <div className="text-xs text-slate-600">Температура: {p.temp}°C</div>
                </div>
              </div>
              <div className="text-sm font-semibold">{p.temp}°</div>
            </div>
          ))}
        </div>

        <div className="mt-3 text-sm text-slate-700 bg-slate-100 rounded-xl p-3">
          Средняя: {avgTemp}°. {phraseByTemp(avgTemp)}
        </div>
      </div>
    </div>
  );
};






