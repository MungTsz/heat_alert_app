// src/hooks/usePlaceValues.ts
import { useEffect, useState } from 'react';

export type ValuePlace = { id: string; latitude: number; longitude: number };

// One value per place (heat index, AQHI…), looked up at each place's own
// coordinates and keyed by place id. Shared by the heat and AQHI hooks so
// the two hazards load, fail and refresh identically. A place whose lookup
// failed is simply absent from the map, so one bad request doesn't blank
// the whole list.
export const usePlaceValues = (
  places: ValuePlace[],
  lookup: (place: ValuePlace) => Promise<number>,
  logLabel: string,
) => {
  const [valueById, setValueById] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(false);

  // Callers usually build `places` inline, so a new array arrives every
  // render — key the effect on the ids/coordinates instead, or it would
  // refetch on every render.
  const placesKey = places.map(p => `${p.id}:${p.latitude},${p.longitude}`).join('|');

  useEffect(() => {
    if (places.length === 0) {
      setValueById({});
      return;
    }

    let isMounted = true;
    setLoading(true);

    Promise.all(
      places.map(place =>
        lookup(place)
          .then(value => [place.id, value] as const)
          .catch(err => {
            console.log(`${logLabel} fetch error for ${place.id}:`, err);
            return null;
          }),
      ),
    )
      .then(results => {
        if (!isMounted) return;
        setValueById(
          Object.fromEntries(
            results.filter((entry): entry is readonly [string, number] => entry !== null),
          ),
        );
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
    // lookup is a module-level provider method — stable for the app's life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placesKey]);

  return { valueById, loading };
};
