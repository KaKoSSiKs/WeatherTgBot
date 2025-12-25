import React, { useEffect, useState } from 'react';
import { Forecast, Location } from '../types';
import { ForecastView } from '../components/ForecastView';
import { WeatherPredictionModal } from '../components/WeatherPredictionModal';

type Props = {
  location: Location | null;
  fetchForecast: (loc: Location) => Promise<Forecast>;
  isLoading: boolean;
  onCreateAlert: () => void;
};

export const ForecastPage = ({ location, fetchForecast, isLoading, onCreateAlert }: Props) => {
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [showPrediction, setShowPrediction] = useState(false);

  useEffect(() => {
    if (!location) return;
    fetchForecast(location).then(setForecast);
  }, [location, fetchForecast]);

  if (!location) return <div className="p-4 text-sm text-slate-600">Добавьте место, чтобы увидеть прогноз.</div>;
  if (isLoading || !forecast) return <div className="p-4">Загрузка...</div>;

  return (
    <>
      <div className="flex justify-end mb-2">
        <button
          className="px-3 py-2 rounded-xl bg-slate-100 text-sm"
          onClick={() => setShowPrediction(true)}
        >
          🎰 Предсказание погоды
        </button>
      </div>

      <ForecastView data={forecast} units="metric" onCreateAlert={onCreateAlert} />

      {showPrediction && <WeatherPredictionModal onClose={() => setShowPrediction(false)} />}
    </>
  );
};

