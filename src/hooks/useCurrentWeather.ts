import { useEffect, useState } from 'react';
import { fetchHkoCurrentWeather } from '../services/hkoApi';
import { calculateHeatIndexCelsius } from '../utils/heatIndexUtils';

type CurrentWeather = {
  temperatureC: number;
  relativeHumidityPct: number;
  heatIndexC: number;
};

export const useCurrentWeather = () => {
  const [data, setData] = useState<CurrentWeather | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;

    fetchHkoCurrentWeather()
      .then(({ temperatureC, relativeHumidityPct }) => {
        const heatIndexC = calculateHeatIndexCelsius(
          temperatureC,
          relativeHumidityPct,
        );
        if (!cancelled) {
          setData({ temperatureC, relativeHumidityPct, heatIndexC });
        }
      })
      .catch(err => {
        console.log('Current weather fetch error:', err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading };
};
