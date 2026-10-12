// src/utils/gpsTrackParser.ts
import { GeoJsonPointFeature, TrackFileFormat } from '../types/exposure';

const UTF8_BOM = '﻿';
// `\b` so <trkpts>-style lookalikes don't count, while <trkpt .../> and
// <trkpt>…</trkpt> both do; <trkseg>/<wpt>/<rtept> never match.
const GPX_TRACK_POINT_TAG = /<trkpt\b/g;

// Sniffs the content rather than the file name: URL sources often have no
// extension, and the picker accepts any file type. Any XML document (GPX
// starts with `<?xml` or `<gpx`) begins with `<`, JSON never does — the
// server does the real GPX validation, so this only routes the upload.
export const detectTrackFormat = (text: string): TrackFileFormat => {
  const head = text.startsWith(UTF8_BOM) ? text.slice(UTF8_BOM.length) : text;
  return head.trimStart().startsWith('<') ? 'gpx' : 'geojson';
};

// Counts every <trkpt> in the file — the GPX equivalent of a GeoJSON file's
// features.length, for the "N GPS points received" summary. Deliberately a
// regex instead of an XML parse: RN has no built-in XML parser and the
// server parses (and filters) the points itself.
export const countGpxTrackPoints = (gpxText: string): number =>
  gpxText.match(GPX_TRACK_POINT_TAG)?.length ?? 0;

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
