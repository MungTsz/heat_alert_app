import { useEffect, useState } from 'react';
import { aqhiDataProvider, AqhiPoint, Coordinates } from '../data/aqhi';

export const useAqhiData = (center: Coordinates | null) => {
  const [points, setPoints] = useState<AqhiPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!center) return;
    let isMounted = true;
    setLoading(true);

    aqhiDataProvider
      .getAqhiPoints(center)
      .then(data => {
        if (isMounted) {
          setPoints(data);
          setLoading(false);
        }
      })
      .catch(err => {
        console.log('AQHI data fetch error:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [center?.latitude, center?.longitude]);

  return { points, loading };
};
