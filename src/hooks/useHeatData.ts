import { useEffect, useState } from 'react';
import { heatDataProvider, HeatPoint, Coordinates } from '../data/heat';

export const useHeatData = (center: Coordinates | null) => {
  const [points, setPoints] = useState<HeatPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!center) return;

    let isMounted = true;
    setLoading(true);

    heatDataProvider
      .getHeatPoints(center)
      .then(data => {
        if (isMounted) {
          setPoints(data);
          setLoading(false);
        }
      })
      .catch(err => {
        console.log('Heat data fetch error:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [center?.latitude, center?.longitude]);

  return { points, loading };
};
