import { summarizePlaceStays } from '../placeStays';
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
  exposure: number,
  extra: Partial<ExposureSegmentResult> = {},
): ExposureSegmentResult => ({
  startTime: T0 + startHour * HOUR,
  endTime: T0 + (startHour + hours) * HOUR,
  lat,
  lon,
  exposure,
  io: 'Home',
  inHk: true,
  kind: 'stay',
  ...extra,
});

const home = place('Home', 22.3, 114.17);
const office = place('Office', 22.28, 114.16);
const gym = place('Gym', 22.32, 114.18);

describe('summarizePlaceStays', () => {
  it('adds up exposure and time at each saved place, highest exposure first', () => {
    const stays = summarizePlaceStays(
      [
        // Home: longest stay, but the lowest exposure
        segment(22.3, 114.17, 0, 6, 0.4),
        segment(22.28, 114.16, 6, 2, 0.9),
        segment(22.3, 114.17, 8, 2, 0.2),
        segment(22.32, 114.18, 10, 1, 0.7),
      ],
      [home, office, gym],
    );
    expect(stays.map(s => s.placeId)).toEqual(['Office', 'Gym', 'Home']);
    expect(stays[2].exposure).toBeCloseTo(0.6);
    expect(stays[2].durationMs).toBe(8 * HOUR);
  });

  it("matches a stay only inside a place's circle, to the nearest place", () => {
    const near = place('Near', 22.3, 114.17, 500);
    const far = place('Far', 22.302, 114.17, 500); // ~220 m away
    // ~330 m north of Home: outside Home's 100 m circle.
    expect(summarizePlaceStays([segment(22.303, 114.17, 0, 1, 1)], [home])).toEqual([]);
    expect(summarizePlaceStays([segment(22.3005, 114.17, 0, 1, 1)], [near, far])[0].placeId).toBe(
      'Near',
    );
  });

  it('skips routes, rows outside Hong Kong and unscored rows, like the day total', () => {
    const stays = summarizePlaceStays(
      [
        segment(22.3, 114.17, 0, 1, 5, { kind: 'route' }),
        segment(22.3, 114.17, 1, 1, 5, { inHk: false }),
        segment(22.3, 114.17, 2, 1, -1),
        // An old row without a kind is a stay.
        segment(22.3, 114.17, 3, 1, 0.5, { kind: undefined }),
      ],
      [home],
    );
    expect(stays).toHaveLength(1);
    expect(stays[0].exposure).toBe(0.5);
  });

  it('leaves out a place with nothing scored', () => {
    expect(summarizePlaceStays([segment(22.3, 114.17, 0, 3, 0)], [home])).toEqual([]);
  });
});
