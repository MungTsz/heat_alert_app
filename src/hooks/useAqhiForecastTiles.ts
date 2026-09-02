// src/hooks/useAqhiForecastTiles.ts
import { useEffect, useState } from 'react';
import { Image } from 'react-native';
import { fetchPraiseTiles, toHkTimestamp } from '../services/praiseApi';
import { isPraiseConfigured } from '../config/praiseConfig';

type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export type AqhiForecastFrame = {
  ts: string; // YYYYMMDDhh, HKT
  hourOffset: number; // 0..FORECAST_HOURS
  uri: string;
  bounds: [[number, number], [number, number]]; // [northEast, southWest]
};

const FORECAST_HOURS = 6;

export const useAqhiForecastTiles = (region: Region, active: boolean) => {
  const [frames, setFrames] = useState<AqhiForecastFrame[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active || !isPraiseConfigured()) {
      setFrames([]);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const lng0 = region.longitude - Math.abs(region.longitudeDelta) / 2;
    const lng1 = region.longitude + Math.abs(region.longitudeDelta) / 2;
    const lat0 = region.latitude - Math.abs(region.latitudeDelta) / 2;
    const lat1 = region.latitude + Math.abs(region.latitudeDelta) / 2;
    const bounds = { lng0, lat0, lng1, lat1 };

    const now = new Date();
    const hourOffsets = Array.from(
      { length: FORECAST_HOURS + 1 },
      (_, i) => i,
    );

    Promise.all(
      hourOffsets.map(hourOffset => {
        const frameDate = new Date(now);
        frameDate.setHours(frameDate.getHours() + hourOffset);
        const ts = toHkTimestamp(frameDate);

        return fetchPraiseTiles('AQHIBN2024', ts, bounds)
          .then(
            (data): AqhiForecastFrame => ({
              ts,
              hourOffset,
              uri: data.tiles.url,
              bounds: [
                [data.tiles.lat1, data.tiles.lng1],
                [data.tiles.lat0, data.tiles.lng0],
              ],
            }),
          )
          .catch(err => {
            console.log('PRAISE forecast tile fetch failed:', ts, err);
            return null;
          });
      }),
    )
      .then(async results => {
        if (cancelled) return;
        const valid = results.filter(
          (frame): frame is AqhiForecastFrame => frame !== null,
        );
        if (valid.length === 0) {
          setError('Forecast animation unavailable');
          setFrames([]);
          return;
        }

        // Wait for every frame's image to actually be in the native image
        // cache before calling it "ready" — otherwise the first play-through
        // stalls on network fetches, showing a blank tile between frames.
        await Promise.all(
          valid.map(frame => Image.prefetch(frame.uri).catch(() => false)),
        );
        if (cancelled) return;
        setFrames(valid);
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
