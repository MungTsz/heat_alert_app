import { useEffect, useState } from 'react';
import { aqhiDataProvider, AqhiPoint, Coordinates } from '../data/aqhi';
import { usePlaceValues, ValuePlace } from './usePlaceValues';

// AQHI at each place's own coordinates, keyed by place id — the peer of
// usePlacesHeatIndex, and the same lookup the alert engine uses, so a card
// and its alert never disagree.
export const usePlacesAqhi = (places: ValuePlace[]) => {
  const { valueById, loading } = usePlaceValues(places, aqhiDataProvider.getAqhiAt, 'AQHI');
  return { aqhiById: valueById, loading };
};

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
