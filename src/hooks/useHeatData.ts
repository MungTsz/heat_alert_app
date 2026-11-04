import { useEffect, useState } from 'react';
import { heatDataProvider, HeatConditions, Coordinates } from '../data/heat';
import { usePlaceValues, ValuePlace } from './usePlaceValues';

// Temperature, RH and heat index at one place (e.g. the user's location).
// conditions stays null until loaded, and on failure — callers render that
// as "unavailable" rather than substituting a value from another source.
export const useHeatConditions = (center: Coordinates | null) => {
  const [conditions, setConditions] = useState<HeatConditions | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!center) return;

    let isMounted = true;
    setLoading(true);

    heatDataProvider
      .getConditionsAt(center)
      .then(data => {
        if (isMounted) setConditions(data);
      })
      .catch(err => {
        console.log('Heat conditions fetch error:', err);
        if (isMounted) setConditions(null);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [center?.latitude, center?.longitude]);

  return { conditions, loading };
};

export type HeatPlace = ValuePlace;

// Heat index for a list of places (bookmarks, a tapped map point), keyed by
// place id — see usePlaceValues for the loading/failure rules, which AQHI's
// usePlacesAqhi shares.
export const usePlacesHeatIndex = (places: HeatPlace[]) => {
  const { valueById, loading } = usePlaceValues(
    places,
    heatDataProvider.getHeatIndexAt,
    'Heat index',
  );
  return { heatIndexById: valueById, loading };
};
