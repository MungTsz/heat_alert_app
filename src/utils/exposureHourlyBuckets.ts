// src/utils/exposureHourlyBuckets.ts
import { ExposureSegmentResult } from '../types/exposure';

export type HourlyExposureBucket = {
  hour: number; // 0-23, HK local
  label: string;
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

// Sums each segment's exposure into its HK-local hour-of-day, matching the
// same "sum, not average" convention totalExposure/ExposureDailyBarChart
// already use. Always returns all 24 hours (zero-filled) so the chart's x
// axis is stable regardless of which hours actually have data. Failed rows
// (the API's -9 sentinel) are excluded from the sum.
export const bucketExposureByHour = (
  segments: ExposureSegmentResult[],
): HourlyExposureBucket[] => {
  const totals = new Array(24).fill(0);
  for (const segment of segments) {
    if (segment.exposure <= 0) continue;
    const hour = hkLocalHour(segment.startTime);
    totals[hour] += segment.exposure;
  }
  return totals.map((total, hour) => ({
    hour,
    label: formatHourLabel(hour),
    total,
  }));
};
