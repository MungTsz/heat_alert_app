// src/utils/trackSegmentation.ts
import { TrackPoint, TrackSegment } from '../types/exposure';
import { distanceMiles } from './distance';

const METERS_PER_MILE = 1609.344;

const distanceMeters = (
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number,
): number => distanceMiles(aLat, aLon, bLat, bLon) * METERS_PER_MILE;

// Collapses consecutive GPS pings into "stay" segments, merging points that
// stay within `stationaryRadiusMeters` of the segment's anchor point. Raw
// tracks (both self-tracked and imported files) commonly log the same spot
// repeatedly — e.g. a network-provider fix every ~20s with ~100m accuracy —
// so without merging, delta_t per API row would be tiny and near-meaningless,
// and the exposure API would be called far more times than necessary.
export const simplifyTrackToSegments = (
  points: TrackPoint[],
  stationaryRadiusMeters: number = 15,
): TrackSegment[] => {
  if (points.length === 0) return [];

  const segments: TrackSegment[] = [];
  let anchor = points[0];
  let segmentStart = points[0].timestampMs;

  for (let i = 1; i < points.length; i++) {
    const point = points[i];
    const d = distanceMeters(anchor.lat, anchor.lon, point.lat, point.lon);

    if (d > stationaryRadiusMeters) {
      segments.push({
        startTime: segmentStart,
        endTime: point.timestampMs,
        lat: anchor.lat,
        lon: anchor.lon,
        speed: anchor.speed,
      });
      anchor = point;
      segmentStart = point.timestampMs;
    }
  }

  const lastPoint = points[points.length - 1];
  segments.push({
    startTime: segmentStart,
    endTime: lastPoint.timestampMs,
    lat: anchor.lat,
    lon: anchor.lon,
    speed: anchor.speed,
  });

  // A segment with zero duration (e.g. a single trailing point) has no
  // delta_t to send to the exposure API.
  return segments.filter(s => s.endTime > s.startTime);
};
