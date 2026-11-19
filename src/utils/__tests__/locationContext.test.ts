import {
  ContextPlace,
  LocationFix,
  currentPositionOf,
  isOverrideActive,
  judgeLocationContext,
  makeOverride,
  resolveLocationContext,
} from '../locationContext';
import { LOCATION_CONTEXT_CONFIG } from '../../config/exposureTrackingConfig';

const MINUTE = 60 * 1000;
// Noon HKT, 15 August 2026.
const NOW = Date.UTC(2026, 7, 15, 4);

// A spot in Kowloon, and positions a given number of metres north / east.
const ORIGIN = { latitude: 22.3193, longitude: 114.1694 };
const METRES_PER_DEG_LAT = 111320;
const METRES_PER_DEG_LON = METRES_PER_DEG_LAT * Math.cos((ORIGIN.latitude * Math.PI) / 180);
const at = (north: number, east = 0) => ({
  latitude: ORIGIN.latitude + north / METRES_PER_DEG_LAT,
  longitude: ORIGIN.longitude + east / METRES_PER_DEG_LON,
});

const fix = (minutesAgo: number, north: number, east = 0, accuracyMeters = 10): LocationFix => ({
  ...at(north, east),
  timeMs: NOW - minutesAgo * MINUTE,
  accuracyMeters,
});

// A straight track: one fix every `everySeconds` from `fromMinutesAgo` to
// `toMinutesAgo`, moving north at `speedMps` from `startNorth`.
const track = (
  fromMinutesAgo: number,
  toMinutesAgo: number,
  speedMps: number,
  everySeconds: number,
  startNorth = 0,
): LocationFix[] => {
  const fixes: LocationFix[] = [];
  for (let s = 0; s <= (fromMinutesAgo - toMinutesAgo) * 60; s += everySeconds) {
    fixes.push(fix(fromMinutesAgo - s / 60, startNorth + speedMps * s));
  }
  return fixes;
};

// Home: a 25 m circle 1 km south of the origin, far from every track.
const HOME: ContextPlace = { ...at(-1000), radiusMeters: 25 };
const PLACES = [HOME];

const WALK = 1.4;
const BUS = 10;

describe('judgeLocationContext', () => {
  it('is unknown with nothing to go on', () => {
    expect(judgeLocationContext([], PLACES, NOW)).toBe('unknown');
  });

  it('is unknown when the newest position is too old', () => {
    const stale = LOCATION_CONTEXT_CONFIG.maxFixAgeMinutes + 5;
    expect(judgeLocationContext(track(stale + 20, stale, WALK, 20), PLACES, NOW)).toBe('unknown');
  });

  it('ignores fixes too blurry to place the phone', () => {
    const blurry = LOCATION_CONTEXT_CONFIG.maxAccuracyMeters + 1;
    expect(judgeLocationContext([fix(1, -1000, 0, blurry)], PLACES, NOW)).toBe('unknown');
  });

  it('is indoors at any saved place — someone else’s home too, such as Mum’s', () => {
    const mumsHome: ContextPlace = { ...at(2000), radiusMeters: 30 };
    expect(judgeLocationContext([fix(2, 2000)], [HOME, mumsHome], NOW)).toBe('indoors');
  });

  it('is indoors inside a saved place, allowing for indoor GPS drift', () => {
    expect(judgeLocationContext([fix(2, -1000)], PLACES, NOW)).toBe('indoors');
    // Outside the 25 m circle, inside the drift margin.
    expect(judgeLocationContext([fix(2, -1000 + 45)], PLACES, NOW)).toBe('indoors');
    expect(judgeLocationContext([fix(2, -1000 + 80)], PLACES, NOW)).not.toBe('indoors');
  });

  it('is on the move at vehicle speed, and stays so through a short stop', () => {
    expect(judgeLocationContext(track(5, 0, BUS, 5), PLACES, NOW)).toBe('transit');
    // A bus stopped for two minutes at a stop.
    const stopped = [...track(10, 2, BUS, 5), ...track(2, 0, 0, 30, BUS * 8 * 60)];
    expect(judgeLocationContext(stopped, PLACES, NOW)).toBe('transit');
  });

  it('does not mistake indoor GPS jitter for movement', () => {
    const jitter = [0, 1, 2, 3, 4, 5].map(i => fix(i * 0.25, i % 2 === 0 ? 15 : -15));
    expect(judgeLocationContext(jitter, PLACES, NOW)).not.toBe('transit');
  });

  it('is outdoors after walking outside every saved place for long enough', () => {
    const minutes = LOCATION_CONTEXT_CONFIG.outdoorMinMinutes + 1;
    expect(judgeLocationContext(track(minutes, 0, WALK, 20), PLACES, NOW)).toBe('outdoors');
  });

  it('is unknown before the outdoor time has passed', () => {
    const minutes = LOCATION_CONTEXT_CONFIG.outdoorMinMinutes - 5;
    // Tracking only just started.
    expect(judgeLocationContext(track(minutes, 0, WALK, 20), PLACES, NOW)).toBe('unknown');
    // Just left home.
    const leftHome = [...track(40, 10, 0, 300, -1000), ...track(10, 0, WALK, 20, -900)];
    expect(judgeLocationContext(leftHome, PLACES, NOW)).toBe('unknown');
  });

  it('is unknown after sitting still outside every saved place — a café looks the same', () => {
    expect(judgeLocationContext(track(40, 0, 0, 300), PLACES, NOW)).toBe('unknown');
  });

  it('is unknown across a hole in the track, such as an MTR ride', () => {
    const withGap = [...track(25, 13, WALK, 20), ...track(1, 0, WALK, 20, 3000)];
    expect(judgeLocationContext(withGap, PLACES, NOW)).toBe('unknown');
  });

  it('is unknown just off a bus, until the outdoor time has passed on foot', () => {
    const offTheBus = [...track(20, 8, BUS, 5), ...track(8, 0, WALK, 20, BUS * 12 * 60)];
    expect(judgeLocationContext(offTheBus, PLACES, NOW)).toBe('unknown');
  });
});

describe('resolveLocationContext', () => {
  const base = {
    trackingOn: true,
    fixes: track(20, 0, WALK, 20),
    places: PLACES,
    dailyActivity: 'indoors' as const,
    override: null,
    position: at(0),
    nowMs: NOW,
  };

  it('follows tracking when it is on', () => {
    expect(resolveLocationContext(base)).toEqual({ context: 'outdoors', source: 'tracking' });
    expect(resolveLocationContext({ ...base, fixes: [] })).toEqual({
      context: 'unknown',
      source: 'none',
    });
  });

  it('without tracking: outdoors for "Often outdoors", unknown for everyone else', () => {
    expect(resolveLocationContext({ ...base, trackingOn: false })).toEqual({
      context: 'unknown',
      source: 'none',
    });
    expect(
      resolveLocationContext({ ...base, trackingOn: false, dailyActivity: 'outdoors' }),
    ).toEqual({ context: 'outdoors', source: 'dailyActivity' });
  });

  it('puts the user’s correction first while the stay lasts', () => {
    const override = makeOverride('indoors', at(0), NOW - 30 * MINUTE);
    expect(resolveLocationContext({ ...base, override })).toEqual({
      context: 'indoors',
      source: 'override',
    });
    // Left the spot: back to the judgement.
    expect(resolveLocationContext({ ...base, override, position: at(500) }).source).toBe(
      'tracking',
    );
  });
});

describe('isOverrideActive', () => {
  const override = makeOverride('outdoors', at(0), NOW);

  it('lasts while the phone stays near where it was made', () => {
    expect(isOverrideActive(override, at(50), NOW + 60 * MINUTE)).toBe(true);
    expect(
      isOverrideActive(override, at(LOCATION_CONTEXT_CONFIG.overrideRadiusMeters + 50), NOW),
    ).toBe(false);
  });

  it('ends at Hong Kong midnight', () => {
    // 23:59 and 00:01 HKT on the next day.
    const lateTonight = Date.UTC(2026, 7, 15, 15, 59);
    const pastMidnight = Date.UTC(2026, 7, 15, 16, 1);
    expect(isOverrideActive(override, at(0), lateTonight)).toBe(true);
    expect(isOverrideActive(override, at(0), pastMidnight)).toBe(false);
  });

  it('holds until midnight when there is no position to compare', () => {
    expect(isOverrideActive(override, null, NOW + 60 * MINUTE)).toBe(true);
    expect(isOverrideActive(makeOverride('indoors', null, NOW), at(5000), NOW)).toBe(true);
  });
});

describe('currentPositionOf', () => {
  const fallback = at(-200);

  it('uses the newest fresh tracked fix, else the fallback', () => {
    expect(currentPositionOf([fix(30, 0), fix(1, 100)], fallback, NOW)).toEqual(at(100));
    expect(currentPositionOf([fix(30, 0)], fallback, NOW)).toEqual(fallback);
    expect(currentPositionOf([], null, NOW)).toBeNull();
  });
});
