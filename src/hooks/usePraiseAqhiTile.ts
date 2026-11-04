// src/hooks/usePraiseAqhiTile.ts
import { useEffect, useState } from 'react';
import { Region } from 'react-native-maps';
import { fetchPraiseTiles, toHkTimestamp } from '../services/praiseApi';
import { isPraiseConfigured } from '../config/praiseConfig';
import { MapTile } from '../types/mapSettings';
import { regionToBounds } from '../utils/mapRegion';

type TileResult = MapTile | null;

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

    fetchPraiseTiles('AQHIBN2024', toHkTimestamp(), regionToBounds(region))
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
