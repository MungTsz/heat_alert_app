// src/utils/exposureHourlyBuckets.ts
import { ExposureIo, ExposureSegmentResult } from '../types/exposure';
import { addSegmentToIoTotals, emptyIoTotals } from './exposureIoTotals';

export type HourlyExposureBucket = {
  hour: number; // 0-23, HK local
  label: string;
  byIo: Record<ExposureIo, number>;
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

// Sums each segment's exposure into its HK-local hour-of-day, split by io
// for the stacked-bar chart. Always returns all 24 hours (zero-filled) so
// the chart's x axis is stable regardless of which hours actually have
// data. Failed rows are excluded by the shared addSegmentToIoTotals rule.
export const bucketExposureByHour = (
  segments: ExposureSegmentResult[],
): HourlyExposureBucket[] => {
  const perHour = Array.from({ length: 24 }, emptyIoTotals);
  for (const segment of segments) {
    addSegmentToIoTotals(perHour[hkLocalHour(segment.startTime)], segment);
  }
  return perHour.map(({ byIo, total }, hour) => ({
    hour,
    label: formatHourLabel(hour),
    byIo,
    total,
  }));
};
