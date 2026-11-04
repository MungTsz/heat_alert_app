jest.mock('../../../config/spatialTempConfig', () => ({
  SPATIAL_TEMP_CONFIG: {
    baseUrl: 'http://api.test',
    timeoutMs: 1000,
    latestTimeCacheMs: 0,
    forecastHorizonHours: 48,
    forecastFromHistory: true,
  },
}));
jest.mock('../../../services/spatialTempApi');

import { apiForecastProvider } from '../apiForecastProvider';
import { lastObservedIndex } from '../types';
import {
  fetchLatestTime,
  fetchPointSeries,
} from '../../../services/spatialTempApi';
import { shiftHkTimestamp } from '../../../utils/hkDate';

const LATEST = '2026110408'; // Wed 4 Nov 2026, 08:00 HKT

// One fake reading per hour, value = hours before LATEST (so each point's
// source hour is easy to assert on).
const seriesFrom = (t0: string, t1: string) => {
  const ts: string[] = [];
  for (let t = t0; t <= t1; t = shiftHkTimestamp(t, 1)) ts.push(t);
  return { ts, values: ts.map((_, i) => ts.length - 1 - i) };
};

describe('apiForecastProvider (demo forecast from history)', () => {
  beforeEach(() => {
    (fetchLatestTime as jest.Mock).mockResolvedValue(LATEST);
    (fetchPointSeries as jest.Mock).mockImplementation(
      async (_family, _lat, _lng, t0: string, t1: string) => seriesFrom(t0, t1),
    );
  });

  it('fetches one window covering both today and the borrowed history', async () => {
    await apiForecastProvider.getForecast({ latitude: 22.3, longitude: 114.17 });
    // latest-47h (Mon 09:00) is earlier than today's 00:00, so it wins.
    expect((fetchPointSeries as jest.Mock).mock.calls[0].slice(3)).toEqual([
      '2026110209',
      LATEST,
    ]);
  });

  it('marks today up to the latest hour as observed, then 48 forecast hours', async () => {
    const days = await apiForecastProvider.getForecast({
      latitude: 22.3,
      longitude: 114.17,
    });

    expect(days.map(d => [d.weekdayShort, d.dayOfMonth, d.isToday])).toEqual([
      ['Wed', 4, true],
      ['Thu', 5, false],
      ['Fri', 6, false],
    ]);

    const today = days[0];
    // 00:00..08:00 observed, then forecast to 23:00
    expect(today.points).toHaveLength(24);
    expect(lastObservedIndex(today.points)).toBe(8);
    expect(today.points[8].heatIndex).toBe(0); // the latest real reading

    const all = days.flatMap(d => d.points);
    expect(all.filter(p => !p.observed)).toHaveLength(48);
    expect(all[all.length - 1].time).toBe('08:00'); // Fri 08:00 = latest + 48h
  });

  it('fills each future hour with the reading from 48 hours earlier', async () => {
    const days = await apiForecastProvider.getForecast({
      latitude: 22.3,
      longitude: 114.17,
    });
    // Thu 09:00 borrows Tue 09:00, which is 23h before LATEST.
    const thu9 = days[1].points.find(p => p.time === '09:00')!;
    expect(thu9.observed).toBe(false);
    expect(thu9.heatIndex).toBe(23);
  });
});
