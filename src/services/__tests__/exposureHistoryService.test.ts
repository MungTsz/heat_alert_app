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

jest.mock('../../data/exposure', () => ({
  exposureDataProvider: { getHourlyReport: jest.fn() },
}));

import {
  refreshHistoryCache,
  getCachedDailyExposureHistory,
} from '../exposureHistoryService';
import { exposureDataProvider } from '../../data/exposure';
import { ExposureReport, ExposureSegmentResult } from '../../types/exposure';

const mockedGetHourlyReport = exposureDataProvider.getHourlyReport as jest.Mock;

const segment = (startTime: number, exposure: number): ExposureSegmentResult => ({
  startTime,
  endTime: startTime + 3600000,
  lat: 22.3,
  lon: 114.2,
  exposure,
  io: 'Outdoor',
});

const reportFrom = (segments: ExposureSegmentResult[]): ExposureReport => ({
  totalExposure: segments.reduce((s, x) => s + x.exposure, 0),
  segments,
  timeRangeStart: segments[0]?.startTime ?? 0,
  timeRangeEnd: segments[segments.length - 1]?.endTime ?? 0,
  pointCount: segments.length,
});

describe('exposureHistoryService', () => {
  beforeEach(() => {
    mockStore.clear();
    mockedGetHourlyReport.mockReset();
  });

  it('fetches, day-slices, and caches the backend report', async () => {
    mockedGetHourlyReport.mockResolvedValue(
      reportFrom([segment(Date.UTC(2026, 8, 7, 2, 0), 5)]),
    );

    const history = await refreshHistoryCache('local-device');

    expect(mockedGetHourlyReport).toHaveBeenCalledWith('local-device');
    expect(history).toHaveLength(1);
    expect(history[0].date).toBe('2026-09-07');
    expect(history[0].report.totalExposure).toBe(5);
  });

  it('getCachedDailyExposureHistory reads the cache without calling the backend', async () => {
    mockedGetHourlyReport.mockResolvedValue(
      reportFrom([segment(Date.UTC(2026, 8, 7, 2, 0), 5)]),
    );
    await refreshHistoryCache('local-device');
    mockedGetHourlyReport.mockClear();

    const cached = await getCachedDailyExposureHistory('local-device');

    expect(mockedGetHourlyReport).not.toHaveBeenCalled();
    expect(cached).toHaveLength(1);
    expect(cached[0].report.totalExposure).toBe(5);
  });

  it('keeps a named device\'s cache separate from the live device\'s', async () => {
    mockedGetHourlyReport.mockResolvedValueOnce(
      reportFrom([segment(Date.UTC(2026, 8, 7, 2, 0), 5)]),
    );
    await refreshHistoryCache('local-device');

    mockedGetHourlyReport.mockResolvedValueOnce(
      reportFrom([segment(Date.UTC(2026, 8, 7, 2, 0), 3)]),
    );
    await refreshHistoryCache('device-abc');

    expect((await getCachedDailyExposureHistory('local-device'))[0].report.totalExposure).toBe(5);
    expect((await getCachedDailyExposureHistory('device-abc'))[0].report.totalExposure).toBe(3);
  });

  it('returns an empty cache before any refresh has happened', async () => {
    expect(await getCachedDailyExposureHistory('never-fetched')).toEqual([]);
  });
});
