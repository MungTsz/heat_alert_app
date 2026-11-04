// src/hooks/useHeatIndexForecastTiles.ts
import { useEffect, useState } from 'react';
import { Image } from 'react-native';
import { Region } from 'react-native-maps';
import {
  AreaTile,
  fetchAreaTile,
  fetchAreaTimeseries,
  fetchLatestTime,
} from '../services/spatialTempApi';
import { SPATIAL_TEMP_CONFIG } from '../config/spatialTempConfig';
import { MAP_LAYER_CONFIG } from '../config/mapLayerConfig';
import { MapForecastFrame } from '../types/mapSettings';
import { regionToBounds } from '../utils/mapRegion';
import { parseHkTimestamp, shiftHkTimestamp } from '../utils/hkDate';

const HOUR_MS = 60 * 60 * 1000;

// Heat index counterpart of useAqhiForecastTiles — same frame shape, same
// length (MAP_LAYER_CONFIG.forecastHours), same pre-caching — so the heat
// layer's Play Forecast behaves exactly like the AQHI one.
//
// Frame 0 is the latest observed hour. While the API has no forecast
// (SPATIAL_TEMP_CONFIG.forecastFromHistory), the following frames reuse the
// map from forecastHorizonHours earlier, relabelled to the hour they stand
// in for — the same demo rule the forecast chart uses, so the map and chart
// never disagree about a future hour.
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

    const bounds = regionToBounds(region);
    const { forecastHours } = MAP_LAYER_CONFIG;
    const { forecastFromHistory, forecastHorizonHours: horizon } =
      SPATIAL_TEMP_CONFIG;

    const loadFrames = async (): Promise<MapForecastFrame[]> => {
      const latest = await fetchLatestTime('heat-index');
      const latestMs = parseHkTimestamp(latest);
      const toFrame = (tile: AreaTile, ts: string): MapForecastFrame => ({
        ts,
        hourOffset: Math.round((parseHkTimestamp(ts) - latestMs) / HOUR_MS),
        uri: tile.uri,
        bounds: tile.bounds,
      });

      if (!forecastFromHistory) {
        const tiles = await fetchAreaTimeseries(
          'heat-index',
          latest,
          shiftHkTimestamp(latest, forecastHours),
          bounds,
        );
        return tiles.map(tile => toFrame(tile, tile.ts));
      }

      const [current, borrowed] = await Promise.all([
        fetchAreaTile('heat-index', latest, bounds),
        fetchAreaTimeseries(
          'heat-index',
          shiftHkTimestamp(latest, 1 - horizon),
          shiftHkTimestamp(latest, forecastHours - horizon),
          bounds,
        ),
      ]);
      return [
        toFrame(current, latest),
        ...borrowed.map(tile =>
          toFrame(tile, shiftHkTimestamp(tile.ts, horizon)),
        ),
      ];
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
