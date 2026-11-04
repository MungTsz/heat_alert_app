// src/hooks/useHeatIndexTile.ts
import { useEffect, useState } from 'react';
import { Region } from 'react-native-maps';
import { fetchAreaTile, fetchLatestTime } from '../services/spatialTempApi';
import { MapTile } from '../types/mapSettings';
import { regionToBounds } from '../utils/mapRegion';

// Heat index counterpart of usePraiseAqhiTile — same shape, same per-region
// fetching — so MapScreen drives both hazard layers identically. The PNG is
// rendered server-side, so the map shows exactly the field the point values
// come from.
export const useHeatIndexTile = (region: Region, active: boolean) => {
  const [tile, setTile] = useState<MapTile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!active) {
      setTile(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetchLatestTime('heat-index')
      .then(ts => fetchAreaTile('heat-index', ts, regionToBounds(region)))
      .then(data => {
        if (!cancelled) setTile({ uri: data.uri, bounds: data.bounds });
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
  }, [
    active,
    region.latitude,
    region.longitude,
    region.latitudeDelta,
    region.longitudeDelta,
  ]);

  return { tile, loading };
};
