// src/utils/exposureIoTotals.ts
import { EXPOSURE_IO_TYPES, ExposureIo, ExposureSegmentResult } from '../types/exposure';

export type ExposureIoTotals = { byIo: Record<ExposureIo, number>; total: number };

// Keyed off EXPOSURE_IO_TYPES so a new io type only has to be added there —
// every per-io total starts at 0 instead of being undefined.
export const emptyIoTotals = (): ExposureIoTotals => ({
  byIo: Object.fromEntries(EXPOSURE_IO_TYPES.map(io => [io, 0])) as Record<ExposureIo, number>,
  total: 0,
});

// Adds one segment into a running per-io total. Shared by the day-level sum
// below and the per-hour bucketer (exposureHourlyBuckets.ts) so both apply
// the same rule: failed rows (a non-positive exposure sentinel) are excluded.
export const addSegmentToIoTotals = (
  totals: ExposureIoTotals,
  segment: ExposureSegmentResult,
): void => {
  if (segment.exposure <= 0) return;
  totals.byIo[segment.io] += segment.exposure;
  totals.total += segment.exposure;
};

// "Outdoor 0.42 · Home 0.10" for a chart's selected-bar label — only io
// types with a non-zero value, so a 3-way split doesn't overflow the label.
export const formatIoBreakdown = (byIo: Record<ExposureIo, number>): string =>
  EXPOSURE_IO_TYPES.filter(io => byIo[io] > 0)
    .map(io => `${io} ${byIo[io].toFixed(2)}`)
    .join(' · ');

// Sums a set of segments (e.g. one day's) into per-io totals for the
// stacked-bar charts — used where only the day-level split is needed
// (ExposureDailyBarChart).
export const sumExposureByIo = (segments: ExposureSegmentResult[]): ExposureIoTotals => {
  const totals = emptyIoTotals();
  for (const segment of segments) addSegmentToIoTotals(totals, segment);
  return totals;
};
