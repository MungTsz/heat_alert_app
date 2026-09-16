import { toExposureSegments, buildExposureReport, hkTimestampToEpochMs } from '../hourlyExposureAdapter';
import { ExposureHourlyApiRow } from '../../types/exposure';

const row = (overrides: Partial<ExposureHourlyApiRow> = {}): ExposureHourlyApiRow => ({
  hour_start_hk: '20260830160000',
  io: 'Outdoor',
  delta_t_hours: 1,
  exposure_value: 2.5,
  lng: 114.2,
  lat: 22.3,
  ...overrides,
});

describe('toExposureSegments', () => {
  it('carries through a normal numeric exposure_value', () => {
    const [segment] = toExposureSegments([row({ exposure_value: 2.5 })]);
    expect(segment.exposure).toBe(2.5);
  });

  it('normalizes a null exposure_value (backend row it could not compute) to 0', () => {
    // Cast: the backend's actual JSON can violate the `number` type it's declared as.
    const [segment] = toExposureSegments([
      row({ exposure_value: null as unknown as number }),
    ]);
    expect(segment.exposure).toBe(0);
  });

  it('normalizes a missing exposure_value to 0', () => {
    const malformed = { ...row() } as Partial<ExposureHourlyApiRow>;
    delete malformed.exposure_value;
    const [segment] = toExposureSegments([malformed as ExposureHourlyApiRow]);
    expect(segment.exposure).toBe(0);
  });

  it('normalizes a NaN exposure_value to 0', () => {
    const [segment] = toExposureSegments([row({ exposure_value: NaN })]);
    expect(segment.exposure).toBe(0);
  });
});

describe('buildExposureReport', () => {
  it('does not blow up totalExposure when a row has a null exposure_value', () => {
    const report = buildExposureReport([
      row({ exposure_value: null as unknown as number }),
      row({ exposure_value: 1.5 }),
    ]);
    expect(report.totalExposure).toBeCloseTo(1.5, 5);
    expect(report.segments.every(s => typeof s.exposure === 'number' && !Number.isNaN(s.exposure))).toBe(true);
  });
});

describe('hkTimestampToEpochMs', () => {
  it('parses a YYYYMMDDHHMMSS HK-local timestamp back into epoch ms', () => {
    const ms = hkTimestampToEpochMs('20260830160000');
    expect(ms).toBe(Date.UTC(2026, 7, 30, 8, 0, 0));
  });
});
