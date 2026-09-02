import { buildExposureRows } from '../buildExposureRequestRows';
import { TrackSegment } from '../../types/exposure';

describe('buildExposureRows', () => {
  const segments: TrackSegment[] = [
    {
      startTime: Date.UTC(2026, 7, 30, 16, 0, 0),
      endTime: Date.UTC(2026, 7, 30, 16, 30, 0), // 30 minutes = 0.5h
      lat: 22.3399352,
      lon: 114.2632821,
      speed: 1.2,
    },
    {
      startTime: Date.UTC(2026, 7, 30, 16, 30, 0),
      endTime: Date.UTC(2026, 7, 30, 17, 0, 0), // 30 minutes = 0.5h
      lat: 22.34,
      lon: 114.263,
      // no speed
    },
  ];

  it('builds one row per segment with the 9-element positional shape', () => {
    const rows = buildExposureRows(segments, 'device-1');
    expect(rows.length).toBe(2);
    rows.forEach(row => expect(row.length).toBe(9));
  });

  it('always assumes Outdoor and status -1', () => {
    const [row] = buildExposureRows(segments, 'device-1');
    expect(row[5]).toEqual({ IO: 'Outdoor' });
    expect(row[8]).toBe(-1);
  });

  it('uses "NULL" for record_id and the given pid', () => {
    const [row] = buildExposureRows(segments, 'device-1');
    expect(row[0]).toBe('NULL');
    expect(row[2]).toBe('device-1');
  });

  it('computes delta_t in hours from segment duration', () => {
    const [row] = buildExposureRows(segments, 'device-1');
    expect(row[6]).toBeCloseTo(0.5, 5);
  });

  it('defaults speed to 0 when the segment has none', () => {
    const [, secondRow] = buildExposureRows(segments, 'device-1');
    expect(secondRow[7]).toBe(0);
  });

  it('carries speed through when the segment has one', () => {
    const [row] = buildExposureRows(segments, 'device-1');
    expect(row[7]).toBe(1.2);
  });

  it('formats t as a 14-digit YYYYMMDDHHmmss string', () => {
    const [row] = buildExposureRows(segments, 'device-1');
    expect(row[1]).toMatch(/^\d{14}$/);
  });
});
