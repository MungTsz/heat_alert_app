import { bucketExposureByHour, formatHourLabel } from '../exposureHourlyBuckets';
import { ExposureSegmentResult } from '../../types/exposure';

const segment = (
  startTime: number,
  exposure: number,
): ExposureSegmentResult => ({
  startTime,
  endTime: startTime + 1000,
  lat: 22.3,
  lon: 114.2,
  exposure,
});

describe('bucketExposureByHour', () => {
  it('always returns all 24 hours, zero-filled where there is no data', () => {
    const buckets = bucketExposureByHour([]);
    expect(buckets.length).toBe(24);
    expect(buckets.every(b => b.total === 0)).toBe(true);
    expect(buckets.map(b => b.hour)).toEqual(Array.from({ length: 24 }, (_, i) => i));
  });

  it('sums multiple segments landing in the same HK-local hour', () => {
    // 2026-08-30T08:00:00Z + 8h = 2026-08-30 16:00 HKT
    const t1 = Date.UTC(2026, 7, 30, 8, 5, 0);
    const t2 = Date.UTC(2026, 7, 30, 8, 45, 0);
    const buckets = bucketExposureByHour([segment(t1, 1.5), segment(t2, 2.5)]);
    const hour16 = buckets.find(b => b.hour === 16);
    expect(hour16?.total).toBeCloseTo(4, 5);
  });

  it('excludes non-positive (failed) exposure values', () => {
    const t = Date.UTC(2026, 7, 30, 8, 0, 0); // 16:00 HKT
    const buckets = bucketExposureByHour([segment(t, -9), segment(t, 2)]);
    const hour16 = buckets.find(b => b.hour === 16);
    expect(hour16?.total).toBeCloseTo(2, 5);
  });
});

describe('formatHourLabel', () => {
  it('formats midnight and noon as 12AM/12NN', () => {
    expect(formatHourLabel(0)).toBe('12AM');
    expect(formatHourLabel(12)).toBe('12NN');
  });

  it('formats AM and PM hours', () => {
    expect(formatHourLabel(1)).toBe('1AM');
    expect(formatHourLabel(13)).toBe('1PM');
    expect(formatHourLabel(23)).toBe('11PM');
  });
});
