import { useEffect, useState } from 'react';
import { heatDataProvider, HeatConditions, Coordinates } from '../data/heat';

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

export type HeatPlace = { id: string } & Coordinates;

// Heat index for a list of places (bookmarks, a tapped map point), keyed by
// place id. A place whose lookup failed is simply absent from the map, so
// one bad request doesn't blank the whole list.
export const usePlacesHeatIndex = (places: HeatPlace[]) => {
  const [heatIndexById, setHeatIndexById] = useState<Record<string, number>>(
    {},
  );
  const [loading, setLoading] = useState<boolean>(false);

  // Callers usually build `places` inline, so a new array arrives every
  // render — key the effect on the ids/coordinates instead, or it would
  // refetch on every render.
  const placesKey = places
    .map(p => `${p.id}:${p.latitude},${p.longitude}`)
    .join('|');

  useEffect(() => {
    if (places.length === 0) {
      setHeatIndexById({});
      return;
    }

    let isMounted = true;
    setLoading(true);

    Promise.all(
      places.map(place =>
        heatDataProvider
          .getHeatIndexAt(place)
          .then(value => [place.id, value] as const)
          .catch(err => {
            console.log(`Heat index fetch error for ${place.id}:`, err);
            return null;
          }),
      ),
    )
      .then(results => {
        if (!isMounted) return;
        setHeatIndexById(
          Object.fromEntries(
            results.filter(
              (entry): entry is readonly [string, number] => entry !== null,
            ),
          ),
        );
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placesKey]);

  return { heatIndexById, loading };
};
