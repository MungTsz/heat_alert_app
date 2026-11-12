import { maxDuringIntervals, summarizePlaceStays } from '../placeStays';
import { BookmarkEntry } from '../../types/bookmark';
import { ExposureSegmentResult } from '../../types/exposure';

const HOUR = 60 * 60 * 1000;
const T0 = Date.UTC(2026, 10, 12, 0); // 08:00 HKT

const place = (id: string, latitude: number, longitude: number, radiusMeters = 100): BookmarkEntry => ({
  id,
  label: id,
  address: '',
  latitude,
  longitude,
  category: 'Home',
  radiusMeters,
  updatedAt: 0,
});

const segment = (
  lat: number,
  lon: number,
  startHour: number,
  hours: number,
  extra: Partial<ExposureSegmentResult> = {},
): ExposureSegmentResult => ({
  startTime: T0 + startHour * HOUR,
  endTime: T0 + (startHour + hours) * HOUR,
  lat,
  lon,
  exposure: 1,
  io: 'Home',
  inHk: true,
  kind: 'stay',
  ...extra,
});

const home = place('Home', 22.3, 114.17);
const office = place('Office', 22.28, 114.16);

describe('summarizePlaceStays', () => {
  it('adds up the stays at each saved place, longest first', () => {
    const stays = summarizePlaceStays(
      [
        segment(22.3, 114.17, 0, 1),
        segment(22.28, 114.16, 1, 3),
        segment(22.3, 114.17, 4, 1.5),
      ],
      [home, office],
    );
    expect(stays.map(s => [s.placeId, s.durationMs / HOUR])).toEqual([
      ['Office', 3],
      ['Home', 2.5],
    ]);
    expect(stays[1].intervals).toHaveLength(2);
  });

  it("matches a stay only inside a place's circle, to the nearest place", () => {
    const near = place('Near', 22.3, 114.17, 500);
    const far = place('Far', 22.302, 114.17, 500); // ~220 m away
    // ~330 m north of Home: outside Home's 100 m circle.
    expect(summarizePlaceStays([segment(22.303, 114.17, 0, 1)], [home])).toEqual([]);
    expect(summarizePlaceStays([segment(22.3005, 114.17, 0, 1)], [near, far])[0].placeId).toBe(
      'Near',
    );
  });

  it('skips routes and stays outside Hong Kong, and treats an old row without a kind as a stay', () => {
    const stays = summarizePlaceStays(
      [
        segment(22.3, 114.17, 0, 1, { kind: 'route' }),
        segment(22.3, 114.17, 1, 1, { inHk: false }),
        segment(22.3, 114.17, 2, 1, { kind: undefined }),
      ],
      [home],
    );
    expect(stays).toHaveLength(1);
    expect(stays[0].durationMs).toBe(HOUR);
  });
});

describe('maxDuringIntervals', () => {
  const series = [0, 1, 2, 3, 4].map(h => ({ timestampMs: T0 + h * HOUR, value: 30 + h }));

  it('takes the highest value among the data hours that overlap a stay', () => {
    // 08:30-09:30 overlaps the 08:00 and 09:00 hours only.
    expect(
      maxDuringIntervals(series, [{ startMs: T0 + 0.5 * HOUR, endMs: T0 + 1.5 * HOUR }]),
    ).toBe(31);
  });

  it('is null when the API has none of those hours yet', () => {
    expect(maxDuringIntervals(series, [{ startMs: T0 + 6 * HOUR, endMs: T0 + 7 * HOUR }])).toBeNull();
  });
});
