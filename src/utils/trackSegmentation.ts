// src/utils/trackSegmentation.ts
import { TrackPoint, TrackSegment } from '../types/exposure';

// Fixed clock-aligned window each point is bucketed into (16:00-16:10,
// 16:10-16:20, ...) — one exposure API row per window, rather than one row
// per raw ping. Real GPS-logger exports commonly ping about once a minute;
// calling the exposure API per raw point would be far more calls than
// useful, so points are grouped into fixed windows instead. Flooring raw
// epoch ms by this width lands on clean HK-local :00/:10/:20/... marks with
// no timezone math needed, since HK's UTC+8 offset is a whole number of
// hours.
const BUCKET_DURATION_MS = 10 * 60 * 1000;

// Buckets points into fixed BUCKET_DURATION_MS windows and returns one
// TrackSegment per non-empty window, in chronological order. A window's
// segment always spans its full fixed width (not just the span between the
// first/last point that landed in it) — so every window that has any data,
// including the very last one, gets a well-defined delta_t once sent through
// buildExposureRequestRows. Shared by both live tracking (useTodayExposure)
// and one-shot imports (useExposureReport) so the two behave identically.
export const bucketTrackPoints = (points: TrackPoint[]): TrackSegment[] => {
  if (points.length === 0) return [];

  const segments: TrackSegment[] = [];
  let bucketIndex = Math.floor(points[0].timestampMs / BUCKET_DURATION_MS);
  let anchor = points[0];

  const pushSegment = (index: number, point: TrackPoint) => {
    segments.push({
      startTime: index * BUCKET_DURATION_MS,
      endTime: (index + 1) * BUCKET_DURATION_MS,
      lat: point.lat,
      lon: point.lon,
      speed: point.speed,
    });
  };

  for (let i = 1; i < points.length; i++) {
    const point = points[i];
    const index = Math.floor(point.timestampMs / BUCKET_DURATION_MS);
    if (index !== bucketIndex) {
      pushSegment(bucketIndex, anchor);
      bucketIndex = index;
      anchor = point;
    }
  }
  pushSegment(bucketIndex, anchor);

  return segments;
};
