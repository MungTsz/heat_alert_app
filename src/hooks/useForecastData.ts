import { useEffect, useState } from 'react';
import {
  forecastDataProvider,
  DayForecast,
  Coordinates,
} from '../data/forecast';

export const useForecastData = (center: Coordinates | null) => {
  const [days, setDays] = useState<DayForecast[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!center) return;
    let isMounted = true;
    setLoading(true);

    forecastDataProvider
      .getForecast(center)
      .then(data => {
        if (isMounted) {
          setDays(data);
          setLoading(false);
        }
      })
      .catch(err => {
        console.log('Forecast fetch error:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [center?.latitude, center?.longitude]);

  return { days, loading };
};
