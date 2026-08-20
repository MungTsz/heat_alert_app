import { useEffect, useState } from 'react';
import {
  aqhiForecastProvider,
  AqhiDayForecast,
  Coordinates,
} from '../data/aqhiForecast';

export const useAqhiForecastData = (center: Coordinates | null) => {
  const [days, setDays] = useState<AqhiDayForecast[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!center) return;
    let isMounted = true;
    setLoading(true);

    aqhiForecastProvider
      .getForecast(center)
      .then(data => {
        if (isMounted) {
          setDays(data);
          setLoading(false);
        }
      })
      .catch(err => {
        console.log('AQHI forecast fetch error:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [center?.latitude, center?.longitude]);

  return { days, loading };
};
