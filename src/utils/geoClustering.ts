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
//
// Route segments (kind 'route') are drawn as lines by buildTripLegs, not as
// dots, so they're skipped — but they still close the open run: two stays
// with a walk between them are two visits even if they're 20 m apart. In
// practice the backend already emits one point per stay, so what's left to
// merge here is a stay's hour-split slices (same position) and old
// pre-route rows.
export const clusterStayPoints = (
  segments: ExposureSegmentResult[],
  radiusMeters: number,
): ExposureStayCluster[] => {
  const clusters: ExposureStayCluster[] = [];

  const closeRun = (run: ExposureSegmentResult[]) => {
    if (run.length === 0) return;
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
      inHk: anchor.inHk,
      reason: anchor.reason,
      ioSource: anchor.ioSource,
    });
  };

  let run: ExposureSegmentResult[] = [];
  for (const segment of segments) {
    if (segment.kind === 'route') {
      closeRun(run);
      run = [];
      continue;
    }
    if (run.length === 0) {
      run = [segment];
      continue;
    }
    const anchor = run[0];
    // Also break the run on an io change (e.g. a doorway transition) even
    // when the backend's per-hour reference point hasn't moved — otherwise
    // an Indoor and an Outdoor hour at the same spot would wrongly merge
    // into one cluster with an arbitrary io label. Same for crossing the HK
    // boundary: a scored and an unscored segment must not share one dot/color.
    if (
      segment.io !== anchor.io ||
      segment.inHk !== anchor.inHk ||
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
