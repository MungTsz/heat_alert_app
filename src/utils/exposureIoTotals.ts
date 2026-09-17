// src/utils/exposureIoTotals.ts
import { ExposureSegmentResult } from '../types/exposure';

export type ExposureIoTotals = { indoor: number; outdoor: number; total: number };

// Sums a set of segments (e.g. one day's) into Indoor/Outdoor totals for the
// stacked-bar charts. Mirrors the per-hour split in exposureHourlyBuckets.ts
// but without bucketing by hour — used where only the day-level split is
// needed (ExposureDailyBarChart). Failed rows (a non-positive exposure
// sentinel) are excluded, same as the hourly bucketer.
export const sumExposureByIo = (segments: ExposureSegmentResult[]): ExposureIoTotals => {
  let indoor = 0;
  let outdoor = 0;
  for (const segment of segments) {
    if (segment.exposure <= 0) continue;
    if (segment.io === 'Indoor') {
      indoor += segment.exposure;
    } else {
      outdoor += segment.exposure;
    }
  }
  return { indoor, outdoor, total: indoor + outdoor };
};
