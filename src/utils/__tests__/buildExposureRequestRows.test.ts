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

  it('builds one row per segment with the 6-element positional shape', () => {
    const rows = buildExposureRows(segments, 'device-1');
    expect(rows.length).toBe(2);
    rows.forEach(row => expect(row.length).toBe(6));
  });

  it('always tags the micro-environment as Outdoor', () => {
    const [row] = buildExposureRows(segments, 'device-1');
    expect(row[4]).toEqual({ IO: 'Outdoor' });
  });

  it('places t first and the given pid second', () => {
    const [row] = buildExposureRows(segments, 'device-1');
    expect(row[0]).toMatch(/^\d{14}$/);
    expect(row[1]).toBe('device-1');
  });

  it('places lng then lat in that order', () => {
    const [row] = buildExposureRows(segments, 'device-1');
    expect(row[2]).toBe(114.2632821);
    expect(row[3]).toBe(22.3399352);
  });

  it('computes delta_t in hours from segment duration', () => {
    const [row] = buildExposureRows(segments, 'device-1');
    expect(row[5]).toBeCloseTo(0.5, 5);
  });

  it('formats t as a 14-digit YYYYMMDDHHmmss string', () => {
    const [row] = buildExposureRows(segments, 'device-1');
    expect(row[0]).toMatch(/^\d{14}$/);
  });
});
