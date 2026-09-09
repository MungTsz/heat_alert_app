const mockStore = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key: string) => Promise.resolve(mockStore.get(key) ?? null)),
    setItem: jest.fn((key: string, value: string) => {
      mockStore.set(key, value);
      return Promise.resolve();
    }),
  },
}));

import {
  saveDailyExposureReport,
  getDailyExposureHistory,
} from '../exposureHistoryService';
import { ExposureReport } from '../../types/exposure';

const makeReport = (total: number): ExposureReport => ({
  totalExposure: total,
  segments: [],
  timeRangeStart: 0,
  timeRangeEnd: 0,
  pointCount: 0,
});

describe('exposureHistoryService', () => {
  beforeEach(() => {
    mockStore.clear();
  });

  it('saves and reads back a daily entry', async () => {
    await saveDailyExposureReport('2026-09-07', makeReport(5));
    const history = await getDailyExposureHistory();
    expect(history).toHaveLength(1);
    expect(history[0].date).toBe('2026-09-07');
    expect(history[0].report.totalExposure).toBe(5);
  });

  it('upserts (overwrites) the same date rather than duplicating it', async () => {
    await saveDailyExposureReport('2026-09-07', makeReport(5));
    await saveDailyExposureReport('2026-09-07', makeReport(9));
    const history = await getDailyExposureHistory();
    expect(history).toHaveLength(1);
    expect(history[0].report.totalExposure).toBe(9);
  });

  it('returns entries sorted ascending by date', async () => {
    await saveDailyExposureReport('2026-09-08', makeReport(1));
    await saveDailyExposureReport('2026-09-05', makeReport(2));
    await saveDailyExposureReport('2026-09-07', makeReport(3));
    const history = await getDailyExposureHistory();
    expect(history.map(h => h.date)).toEqual([
      '2026-09-05',
      '2026-09-07',
      '2026-09-08',
    ]);
  });

  it('prunes entries older than 14 days on write', async () => {
    const now = Date.now();
    const old = new Date(now - 20 * 24 * 60 * 60 * 1000);
    const oldDate = old.toISOString().slice(0, 10);

    await saveDailyExposureReport(oldDate, makeReport(1));
    // Force the stale entry's updatedAt into the past directly, since
    // saveDailyExposureReport always stamps "now" on write.
    const raw = JSON.parse(mockStore.get('exposure_daily_history') as string);
    raw[oldDate].updatedAt = now - 20 * 24 * 60 * 60 * 1000;
    mockStore.set('exposure_daily_history', JSON.stringify(raw));

    await saveDailyExposureReport('2026-09-07', makeReport(2));
    const history = await getDailyExposureHistory();
    expect(history.find(h => h.date === oldDate)).toBeUndefined();
    expect(history.find(h => h.date === '2026-09-07')).toBeDefined();
  });

  it('keeps a named device\'s history separate from the live device\'s', async () => {
    await saveDailyExposureReport('2026-09-07', makeReport(5)); // live device
    await saveDailyExposureReport('2026-09-07', makeReport(3), 'device-abc');

    expect((await getDailyExposureHistory()).map(h => h.report.totalExposure)).toEqual([5]);
    expect(
      (await getDailyExposureHistory('device-abc')).map(h => h.report.totalExposure),
    ).toEqual([3]);
  });

  it('merges (accumulates) a named device\'s same-day reports instead of overwriting', async () => {
    const first: ExposureReport = {
      totalExposure: 2,
      segments: [{ startTime: 0, endTime: 1000, lat: 22.3, lon: 114.2, exposure: 2 }],
      timeRangeStart: 0,
      timeRangeEnd: 1000,
      pointCount: 1,
    };
    const second: ExposureReport = {
      totalExposure: 3,
      segments: [{ startTime: 2000, endTime: 3000, lat: 22.3, lon: 114.2, exposure: 3 }],
      timeRangeStart: 2000,
      timeRangeEnd: 3000,
      pointCount: 1,
    };
    await saveDailyExposureReport('2026-09-07', first, 'device-abc');
    await saveDailyExposureReport('2026-09-07', second, 'device-abc');

    const [entry] = await getDailyExposureHistory('device-abc');
    expect(entry.report.segments).toHaveLength(2);
    expect(entry.report.totalExposure).toBe(5);
    expect(entry.report.timeRangeStart).toBe(0);
    expect(entry.report.timeRangeEnd).toBe(3000);
  });
});
