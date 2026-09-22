// src/utils/hourlyExposureAdapter.ts
import {
  ExposureHourlyApiRow,
  ExposureReport,
  ExposureSegmentResult,
} from '../types/exposure';

const MS_PER_HOUR = 3600000;

// Inverse of praiseApi.ts's toHkTimestampFull: parses a YYYYMMDDHHMMSS
// HK-local timestamp (hour_start_hk or start_time_hk) back into epoch ms.
export const hkTimestampToEpochMs = (ts: string): number => {
  const yyyy = Number(ts.slice(0, 4));
  const mm = Number(ts.slice(4, 6));
  const dd = Number(ts.slice(6, 8));
  const hh = Number(ts.slice(8, 10));
  const min = Number(ts.slice(10, 12));
  const ss = Number(ts.slice(12, 14));
  return Date.UTC(yyyy, mm - 1, dd, hh, min, ss) - 8 * 60 * 60 * 1000;
};

// Adapts the ETL backend's per-dwell-run rows into the segment shape the
// existing map/chart/list UI renders. Uses start_time_hk (not hour_start_hk)
// for startTime so segments keep their real chronological order even when
// several rows share an hour — required for the map route (see
// ExposureTrajectoryMap.tsx) to connect points in the order they actually
// happened rather than in whatever order the backend's JSON array used.
// endTime is an approximation (startTime + delta_t_hours) since the backend
// doesn't expose the dwell run's real end, only its (possibly hour-sliced)
// duration.
export const toExposureSegments = (
  rows: ExposureHourlyApiRow[],
): ExposureSegmentResult[] =>
  rows
    .map(row => {
      const startTime = hkTimestampToEpochMs(row.start_time_hk);
      return {
        startTime,
        endTime: startTime + row.delta_t_hours * MS_PER_HOUR,
        lat: row.lat,
        lon: row.lng,
        // Backend sends null/omits exposure_value for a row it couldn't compute
        // (e.g. an imported point outside PRAISE coverage) despite the typed
        // contract saying `number` — normalize to the app's existing
        // non-positive "failed" sentinel convention (see exposureHourlyBuckets.ts)
        // instead of letting `null` reach .toFixed() calls downstream.
        exposure:
          typeof row.exposure_value === 'number' && !Number.isNaN(row.exposure_value)
            ? row.exposure_value
            : 0,
        io: row.io,
      };
    })
    .sort((a, b) => a.startTime - b.startTime);

export const buildExposureReport = (
  rows: ExposureHourlyApiRow[],
): ExposureReport => {
  const segments = toExposureSegments(rows);
  if (segments.length === 0) {
    return { totalExposure: 0, segments: [], timeRangeStart: 0, timeRangeEnd: 0, pointCount: 0 };
  }
  return {
    totalExposure: segments.reduce(
      (sum, s) => sum + (s.exposure > 0 ? s.exposure : 0),
      0,
    ),
    segments,
    timeRangeStart: segments[0].startTime,
    timeRangeEnd: segments[segments.length - 1].endTime,
    pointCount: segments.length,
  };
};
