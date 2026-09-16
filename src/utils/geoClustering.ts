// src/utils/geoClustering.ts
import { ExposureSegmentResult, ExposureStayCluster } from '../types/exposure';

const EARTH_RADIUS_METERS = 6371000;

const toRadians = (deg: number): number => (deg * Math.PI) / 180;

// Great-circle distance in meters. idw.ts's distance() is Euclidean in
// degree-space (fine for IDW weighting) — wrong unit for a real-world "same
// location" radius, so this is a separate helper.
export const haversineMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(a));
};

// Forward azimuth in degrees, 0-360 clockwise from north — matches CSS
// transform: rotate()'s clockwise convention directly, so callers don't need
// to flip the sign before rotating an arrow glyph.
export const computeBearing = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const dLon = toRadians(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
};

// Standard slippy-map zoom formula, made screen-size-independent by taking
// the map's actual rendered width instead of assuming a fixed tile size —
// so the arrow-visibility threshold in exposureMapConfig behaves consistently
// across phone/tablet screens rather than reacting to a raw region delta.
export const computeZoomLevel = (
  longitudeDelta: number,
  containerWidthPx: number,
): number => Math.log2((360 * (containerWidthPx / 256)) / longitudeDelta);

// Greedily merges chronologically-ordered segments into stay-point clusters:
// a run stays open as long as each next segment is within radiusMeters of
// the run's ANCHOR (its first segment), not a running centroid. A running
// centroid would let a slow, steady walk "chain-drift" arbitrarily far from
// the original spot while every single step still passes the check; a fixed
// anchor bounds every cluster to a 2*radiusMeters diameter.
//
// Non-consecutive revisits to the same place (e.g. leave home, come back
// hours later) end up as separate clusters for free: once a run closes
// because a segment fails the radius check, the next run starts fresh with a
// new anchor. There's no global spatial lookup, so this falls out of the
// algorithm's structure — don't "fix" this into a global merge later.
export const clusterStayPoints = (
  segments: ExposureSegmentResult[],
  radiusMeters: number,
): ExposureStayCluster[] => {
  if (segments.length === 0) return [];

  const clusters: ExposureStayCluster[] = [];

  const closeRun = (run: ExposureSegmentResult[]) => {
    const anchor = run[0];
    clusters.push({
      lat: anchor.lat,
      lon: anchor.lon,
      startTime: run[0].startTime,
      endTime: run[run.length - 1].endTime,
      totalDurationMs: run.reduce((sum, s) => sum + (s.endTime - s.startTime), 0),
      mergedSegmentCount: run.length,
      totalExposure: run.reduce((sum, s) => sum + s.exposure, 0),
      io: anchor.io,
    });
  };

  let run: ExposureSegmentResult[] = [segments[0]];
  for (let i = 1; i < segments.length; i++) {
    const segment = segments[i];
    const anchor = run[0];
    // Also break the run on an io change (e.g. a doorway transition) even
    // when the backend's per-hour reference point hasn't moved — otherwise
    // an Indoor and an Outdoor hour at the same spot would wrongly merge
    // into one cluster with an arbitrary io label.
    if (
      segment.io !== anchor.io ||
      haversineMeters(anchor.lat, anchor.lon, segment.lat, segment.lon) > radiusMeters
    ) {
      closeRun(run);
      run = [segment];
    } else {
      run.push(segment);
    }
  }
  closeRun(run);

  return clusters;
};
