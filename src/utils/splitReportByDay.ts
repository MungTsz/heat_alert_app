// src/utils/splitReportByDay.ts
import { ExposureReport, ExposureSegmentResult } from '../types/exposure';
import { toHkDateKey } from './hkDate';

export type DailyReportSlice = {
  date: string; // YYYY-MM-DD, HK local
  report: ExposureReport;
};

// An imported track isn't guaranteed to be a single day — this buckets its
// segments by HK-local calendar day so a multi-day import can be browsed
// with the same per-day view (map/trend/list) the live daily history uses.
export const splitExposureReportByDay = (
  report: ExposureReport,
): DailyReportSlice[] => {
  const byDate = new Map<string, ExposureSegmentResult[]>();

  for (const segment of report.segments) {
    const date = toHkDateKey(new Date(segment.startTime));
    const existing = byDate.get(date);
    if (existing) {
      existing.push(segment);
    } else {
      byDate.set(date, [segment]);
    }
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, segments]) => ({
      date,
      report: {
        totalExposure: segments.reduce(
          (sum, s) => sum + (s.exposure > 0 ? s.exposure : 0),
          0,
        ),
        segments,
        timeRangeStart: segments[0].startTime,
        timeRangeEnd: segments[segments.length - 1].endTime,
        // Raw point counts aren't recoverable post-segmentation — segment
        // count is the closest available proxy for this day's slice.
        pointCount: segments.length,
      },
    }));
};
