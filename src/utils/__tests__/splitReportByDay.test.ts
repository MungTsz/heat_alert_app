import { splitExposureReportByDay } from '../splitReportByDay';
import { ExposureReport, ExposureSegmentResult } from '../../types/exposure';

const segment = (
  startTime: number,
  endTime: number,
  exposure: number,
): ExposureSegmentResult => ({ startTime, endTime, lat: 22.3, lon: 114.2, exposure });

const report = (segments: ExposureSegmentResult[]): ExposureReport => ({
  totalExposure: segments.reduce((s, x) => s + (x.exposure > 0 ? x.exposure : 0), 0),
  segments,
  timeRangeStart: segments[0]?.startTime ?? 0,
  timeRangeEnd: segments[segments.length - 1]?.endTime ?? 0,
  pointCount: segments.length,
});

describe('splitExposureReportByDay', () => {
  it('yields exactly one entry for a single-day report', () => {
    const segments = [
      segment(Date.UTC(2026, 8, 7, 2, 0), Date.UTC(2026, 8, 7, 3, 0), 1),
      segment(Date.UTC(2026, 8, 7, 3, 0), Date.UTC(2026, 8, 7, 4, 0), 2),
    ];
    const result = splitExposureReportByDay(report(segments));
    expect(result.length).toBe(1);
    expect(result[0].date).toBe('2026-09-07');
    expect(result[0].report.segments.length).toBe(2);
  });

  it('buckets segments spanning a day boundary into separate entries', () => {
    // 2026-09-07T20:00:00Z = 2026-09-08T04:00:00+08:00
    const segments = [
      segment(Date.UTC(2026, 8, 7, 2, 0), Date.UTC(2026, 8, 7, 3, 0), 1), // HK 09-07
      segment(Date.UTC(2026, 8, 7, 20, 0), Date.UTC(2026, 8, 7, 21, 0), 3), // HK 09-08
    ];
    const result = splitExposureReportByDay(report(segments));
    expect(result.map(r => r.date)).toEqual(['2026-09-07', '2026-09-08']);
    expect(result[0].report.segments.length).toBe(1);
    expect(result[1].report.segments.length).toBe(1);
  });

  it('computes totalExposure/timeRange independently per day', () => {
    const segments = [
      segment(Date.UTC(2026, 8, 7, 2, 0), Date.UTC(2026, 8, 7, 3, 0), 1),
      segment(Date.UTC(2026, 8, 7, 20, 0), Date.UTC(2026, 8, 7, 21, 0), 3),
    ];
    const result = splitExposureReportByDay(report(segments));
    expect(result[0].report.totalExposure).toBe(1);
    expect(result[1].report.totalExposure).toBe(3);
    expect(result[1].report.timeRangeStart).toBe(Date.UTC(2026, 8, 7, 20, 0));
  });

  it('returns an empty array for a report with no segments', () => {
    expect(splitExposureReportByDay(report([]))).toEqual([]);
  });
});
