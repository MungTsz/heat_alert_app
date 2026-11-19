// src/hooks/useHeatIndexForecastTiles.ts
import { useEffect, useState } from 'react';
import { Image } from 'react-native';
import { Region } from 'react-native-maps';
import {
  clipToDataFootprint,
  currentDataHour,
  fetchAreaTimeseries,
} from '../services/spatialTempApi';
import { MAP_LAYER_CONFIG } from '../config/mapLayerConfig';
import { MapForecastFrame } from '../types/mapSettings';
import { regionToBounds } from '../utils/mapRegion';
import { parseHkTimestamp, shiftHkTimestamp } from '../utils/hkDate';

const HOUR_MS = 60 * 60 * 1000;

// Heat index counterpart of useAqhiForecastTiles — same frame shape, same
// length (MAP_LAYER_CONFIG.forecastHours), same pre-caching — so the heat
// layer's Play Forecast behaves exactly like the AQHI one.
//
// Frame 0 is the current hour (currentDataHour — the same hour the card and
// the current-hour tile show); the following frames are the API's own
// forecast PNGs, all fetched in one /area/timeseries call.
export const useHeatIndexForecastTiles = (region: Region, active: boolean) => {
  const [frames, setFrames] = useState<MapForecastFrame[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active) {
      setFrames([]);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const { forecastHours } = MAP_LAYER_CONFIG;

    const loadFrames = async (): Promise<MapForecastFrame[]> => {
      // Same trimming as the current-hour tile, so no frame has white
      // out-of-data edges; a view with no data has no animation.
      const bounds = await clipToDataFootprint(
        'heat-index',
        regionToBounds(region),
      );
      if (!bounds) return [];
      const now = currentDataHour();
      const nowMs = parseHkTimestamp(now);
      const tiles = await fetchAreaTimeseries(
        'heat-index',
        now,
        shiftHkTimestamp(now, forecastHours),
        bounds,
      );
      return tiles.map(tile => ({
        ts: tile.ts,
        hourOffset: Math.round((parseHkTimestamp(tile.ts) - nowMs) / HOUR_MS),
        uri: tile.uri,
        bounds: tile.bounds,
      }));
    };

    loadFrames()
      .then(async loaded => {
        if (cancelled) return;
        if (loaded.length === 0) {
          setError('Forecast animation unavailable');
          setFrames([]);
          return;
        }
        // Same as AQHI: only "ready" once every frame is in the native image
        // cache, so the first play-through doesn't stall between frames.
        await Promise.all(
          loaded.map(frame => Image.prefetch(frame.uri).catch(() => false)),
        );
        if (cancelled) return;
        setFrames(loaded);
      })
      .catch(err => {
        console.log('Heat index forecast tiles fetch failed:', err);
        if (!cancelled) {
          setError('Forecast animation unavailable');
          setFrames([]);
        }
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

  return { frames, loading, error };
};
