// src/hooks/useHeatIndexMapTile.ts
import { useEffect, useState } from 'react';
import {
  AreaTile,
  fetchAreaTile,
  fetchLatestTime,
} from '../services/spatialTempApi';

// Heat index map layer, rendered server-side by the API so the map shows
// exactly the field the point values come from. Requests the whole data
// footprint once (no bbox) rather than a tile per pan: the field is a
// smooth territory-wide surface, so one ~1000px image stays sharp enough
// at street zoom, and the layer never goes blank while panning.
export const useHeatIndexMapTile = (active: boolean) => {
  const [tile, setTile] = useState<AreaTile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    setLoading(true);

    fetchLatestTime('heat-index')
      .then(ts => fetchAreaTile('heat-index', ts))
      .then(data => {
        if (!cancelled) setTile(data);
      })
      .catch(err => {
        console.log('Heat index tile fetch error:', err);
        if (!cancelled) setTile(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [active]);

  return { tile, loading };
};
