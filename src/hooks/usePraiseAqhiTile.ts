// src/hooks/usePraiseAqhiTile.ts
import { useEffect, useState } from 'react';
import { fetchPraiseTiles, toHkTimestamp } from '../services/praiseApi';
import { isPraiseConfigured } from '../config/praiseConfig';

type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

type TileResult = {
  uri: string;
  bounds: [[number, number], [number, number]]; // [northEast, southWest] — matches react-native-maps Overlay
} | null;

export const usePraiseAqhiTile = (region: Region, active: boolean) => {
  const [tile, setTile] = useState<TileResult>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!active || !isPraiseConfigured()) {
      setTile(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const lng0 = region.longitude - Math.abs(region.longitudeDelta) / 2;
    const lng1 = region.longitude + Math.abs(region.longitudeDelta) / 2;
    const lat0 = region.latitude - Math.abs(region.latitudeDelta) / 2;
    const lat1 = region.latitude + Math.abs(region.latitudeDelta) / 2;

    fetchPraiseTiles('AQHIBN2024', toHkTimestamp(), { lng0, lat0, lng1, lat1 })
      .then(data => {
        if (cancelled) return;
        setTile({
          uri: data.tiles.url,
          bounds: [
            [data.tiles.lat1, data.tiles.lng1], // northEast
            [data.tiles.lat0, data.tiles.lng0], // southWest
          ],
        });
      })
      .catch(err => {
        console.log('PRAISE tile fetch error:', err);
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
