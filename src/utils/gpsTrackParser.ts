// src/utils/gpsTrackParser.ts
import { GeoJsonPointFeature } from '../types/exposure';

type RawGeoJsonFeature = {
  type?: string;
  geometry?: { type?: string; coordinates?: unknown };
  properties?: { time?: string; speed?: number };
};

type GeoJsonFeatureCollection = {
  type?: string;
  features?: RawGeoJsonFeature[];
};

// Validates a GeoJSON FeatureCollection of Point features (the shape
// exported by phone/watch GPS logging apps — properties.time as ISO8601,
// geometry.coordinates as [lng, lat]) and returns the well-formed features
// unmodified, ready to POST to the ETL backend's /ingest endpoint. Malformed
// features are dropped rather than throwing, since real-world exports
// commonly include a few bad rows.
export const extractGeoJsonFeatures = (json: unknown): GeoJsonPointFeature[] => {
  const collection = json as GeoJsonFeatureCollection;
  if (!collection || !Array.isArray(collection.features)) {
    throw new Error('Not a valid GeoJSON FeatureCollection.');
  }

  const features: GeoJsonPointFeature[] = [];

  for (const feature of collection.features) {
    if (feature?.geometry?.type !== 'Point') continue;

    const coords = feature.geometry.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) continue;
    const [lon, lat] = coords;
    if (typeof lon !== 'number' || typeof lat !== 'number') continue;

    const timeStr = feature.properties?.time;
    if (typeof timeStr !== 'string' || Number.isNaN(Date.parse(timeStr))) continue;

    const speed = feature.properties?.speed;

    features.push({
      type: 'Feature',
      properties: { time: timeStr, speed: typeof speed === 'number' ? speed : undefined },
      geometry: { type: 'Point', coordinates: [lon, lat] },
    });
  }

  return features.sort(
    (a, b) => Date.parse(a.properties.time) - Date.parse(b.properties.time),
  );
};
