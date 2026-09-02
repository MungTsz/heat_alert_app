// src/utils/gpsTrackParser.ts
import { TrackPoint } from '../types/exposure';

type GeoJsonFeature = {
  geometry?: { type?: string; coordinates?: unknown };
  properties?: { time?: string; speed?: number };
};

type GeoJsonFeatureCollection = {
  type?: string;
  features?: GeoJsonFeature[];
};

// Parses a GeoJSON FeatureCollection of Point features (the shape exported
// by phone/watch GPS logging apps — properties.time as ISO8601,
// geometry.coordinates as [lng, lat]) into chronologically-sorted
// TrackPoints. Malformed features are dropped rather than throwing, since
// real-world exports commonly include a few bad rows.
export const parseGeoJsonTrack = (json: unknown): TrackPoint[] => {
  const collection = json as GeoJsonFeatureCollection;
  if (!collection || !Array.isArray(collection.features)) {
    throw new Error('Not a valid GeoJSON FeatureCollection.');
  }

  const points: TrackPoint[] = [];

  for (const feature of collection.features) {
    if (feature?.geometry?.type !== 'Point') continue;

    const coords = feature.geometry.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) continue;
    const [lon, lat] = coords;
    if (typeof lon !== 'number' || typeof lat !== 'number') continue;

    const timeStr = feature.properties?.time;
    if (typeof timeStr !== 'string') continue;
    const timestampMs = Date.parse(timeStr);
    if (Number.isNaN(timestampMs)) continue;

    const speed = feature.properties?.speed;

    points.push({
      lat,
      lon,
      timestampMs,
      speed: typeof speed === 'number' ? speed : undefined,
    });
  }

  return points.sort((a, b) => a.timestampMs - b.timestampMs);
};
