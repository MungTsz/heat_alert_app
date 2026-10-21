import {
  buildWeekDays,
  compareWeeks,
  computeWeekStats,
  listWeekStarts,
} from '../exposureWeekStats';
import { ExposureIo } from '../../types/exposure';

const byIo = (outdoor: number, home = 0): Record<ExposureIo, number> => ({
  Outdoor: outdoor,
  Vehicle: 0,
  MTR: 0,
  'Other Indoor': 0,
  School: 0,
  Office: 0,
  Home: home,
});

describe('buildWeekDays', () => {
  const dailyMap = new Map([
    ['2026-10-11', byIo(1, 0.5)],
    ['2026-10-13', byIo(0)],
  ]);
  const days = buildWeekDays('2026-10-11', dailyMap, '2026-10-14');

  it('builds seven consecutive Sun→Sat days', () => {
    expect(days.map(d => d.date)).toEqual([
      '2026-10-11',
      '2026-10-12',
      '2026-10-13',
      '2026-10-14',
      '2026-10-15',
      '2026-10-16',
      '2026-10-17',
    ]);
    expect(days[0].label).toBe('Sun');
    expect(days[6].label).toBe('Sat');
  });

  it('distinguishes tracked, 0-exposure, and untracked days', () => {
    expect(days[0].total).toBe(1.5);
    expect(days[1].total).toBeNull();
    expect(days[2].total).toBe(0);
  });

  it('marks only the days after today as future', () => {
    expect(days.map(d => d.isFuture)).toEqual([false, false, false, false, true, true, true]);
  });
});

describe('computeWeekStats', () => {
  it('averages over tracked days only, counting a 0-exposure day', () => {
    const days = buildWeekDays(
      '2026-10-11',
      new Map([
        ['2026-10-11', byIo(3)],
        ['2026-10-12', byIo(0)],
      ]),
      '2026-10-17',
    );
    expect(computeWeekStats(days)).toEqual({ total: 3, trackedDays: 2, dailyAverage: 1.5 });
  });

  it('returns a null average for a week with no tracked days', () => {
    const days = buildWeekDays('2026-10-11', new Map(), '2026-10-17');
    expect(computeWeekStats(days).dailyAverage).toBeNull();
  });
});

describe('compareWeeks', () => {
  it('reports a drop', () => {
    expect(compareWeeks(0.64, 1)).toEqual({ direction: 'down', pct: 36 });
  });

  it('reports a rise', () => {
    expect(compareWeeks(1.2, 1)).toEqual({ direction: 'up', pct: 20 });
  });

  it('treats a sub-threshold change as the same', () => {
    expect(compareWeeks(1.005, 1)).toEqual({ direction: 'same', pct: 0 });
  });

  it('returns null without a usable baseline', () => {
    expect(compareWeeks(1, null)).toBeNull();
    expect(compareWeeks(1, 0)).toBeNull();
    expect(compareWeeks(null, 1)).toBeNull();
  });
});

describe('listWeekStarts', () => {
  it('lists every week start inclusive, oldest first', () => {
    expect(listWeekStarts('2026-09-27', '2026-10-11')).toEqual([
      '2026-09-27',
      '2026-10-04',
      '2026-10-11',
    ]);
  });
});
