// src/utils/exposureHourlyBuckets.ts
import { ExposureSegmentResult } from '../types/exposure';

export type HourlyExposureBucket = {
  hour: number; // 0-23, HK local
  label: string;
  indoor: number;
  outdoor: number;
  total: number;
};

// Same wall-clock offset math used throughout this feature (hkDate.ts,
// praiseApi.ts) — HK is UTC+8, a whole-hour offset, so no DST edge cases.
const hkLocalHour = (ms: number): number => {
  const utcMs = ms + new Date(ms).getTimezoneOffset() * 60000;
  return new Date(utcMs + 8 * 60 * 60 * 1000).getHours();
};

// Matches AqhiHourlyForecastChart's existing hour-label convention
// (12AM/1AM.../12NN/1PM...) so every hourly chart in the app reads the same way.
export const formatHourLabel = (hour24: number): string => {
  if (hour24 === 0) return '12AM';
  if (hour24 === 12) return '12NN';
  if (hour24 < 12) return `${hour24}AM`;
  return `${hour24 - 12}PM`;
};

// Sums each segment's exposure into its HK-local hour-of-day, split by
// indoor/outdoor for the stacked-bar chart. Always returns all 24 hours
// (zero-filled) so the chart's x axis is stable regardless of which hours
// actually have data. Failed rows (a non-positive exposure sentinel) are
// excluded from the sum.
export const bucketExposureByHour = (
  segments: ExposureSegmentResult[],
): HourlyExposureBucket[] => {
  const indoorTotals = new Array(24).fill(0);
  const outdoorTotals = new Array(24).fill(0);
  for (const segment of segments) {
    if (segment.exposure <= 0) continue;
    const hour = hkLocalHour(segment.startTime);
    if (segment.io === 'Indoor') {
      indoorTotals[hour] += segment.exposure;
    } else {
      outdoorTotals[hour] += segment.exposure;
    }
  }
  return indoorTotals.map((indoor, hour) => ({
    hour,
    label: formatHourLabel(hour),
    indoor,
    outdoor: outdoorTotals[hour],
    total: indoor + outdoorTotals[hour],
  }));
};
