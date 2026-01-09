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

  if (!location) {
    return (
      <div className="p-6 text-center">
        <div className="text-4xl mb-3">📍</div>
        <div className="text-sm sm:text-base text-slate-600">Добавьте место, чтобы увидеть прогноз</div>
      </div>
    );
  }
  if (isLoading || !forecast) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin text-4xl mb-3">🌤️</div>
        <div className="text-sm sm:text-base text-slate-600">Загрузка прогноза...</div>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-end mb-3 sm:mb-4">
        <button
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-xs sm:text-sm font-medium shadow-md active:scale-95 transition-all"
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

