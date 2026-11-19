jest.mock('../../../config/spatialTempConfig', () => ({
  SPATIAL_TEMP_CONFIG: {
    baseUrl: 'http://api.test',
    timeoutMs: 1000,
    forecastHorizonHours: 48,
  },
}));
jest.mock('../../../services/spatialTempApi');

import { apiForecastProvider } from '../apiForecastProvider';
import { lastObservedIndex } from '../types';
import {
  currentDataHour,
  fetchPointSeries,
} from '../../../services/spatialTempApi';
import { shiftHkTimestamp } from '../../../utils/hkDate';

const NOW = '2026110408'; // Wed 4 Nov 2026, 08:00 HKT (e.g. 08:15 on the phone)

// One fake reading per hour, value = hours after t0 (so each point's hour is
// easy to assert on). `lastTs` cuts the series short, as the API does near
// the end of its forecast run.
const seriesFrom = (t0: string, t1: string, lastTs = t1) => {
  const ts: string[] = [];
  for (let t = t0; t <= t1 && t <= lastTs; t = shiftHkTimestamp(t, 1)) ts.push(t);
  return { ts, values: ts.map((_, i) => i) };
};

describe('apiForecastProvider', () => {
  beforeEach(() => {
    (currentDataHour as jest.Mock).mockReturnValue(NOW);
    (fetchPointSeries as jest.Mock).mockImplementation(
      async (_family, _lat, _lng, t0: string, t1: string) => seriesFrom(t0, t1),
    );
  });

  it('fetches one window from today 00:00 to now + 48 h', async () => {
    await apiForecastProvider.getForecast({ latitude: 22.3, longitude: 114.17 });
    expect((fetchPointSeries as jest.Mock).mock.calls[0].slice(3)).toEqual([
      '2026110400',
      '2026110608',
    ]);
  });

  it('marks today up to the current hour as observed, then 48 forecast hours', async () => {
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
    expect(today.points[8].heatIndex).toBe(8); // the current hour's own value

    const all = days.flatMap(d => d.points);
    expect(all.filter(p => !p.observed)).toHaveLength(48);
    expect(all[all.length - 1].time).toBe('08:00'); // Fri 08:00 = now + 48h
  });

  it("uses the API's own value for each forecast hour", async () => {
    const days = await apiForecastProvider.getForecast({
      latitude: 22.3,
      longitude: 114.17,
    });
    // Thu 09:00 is 33 h after Wed 00:00.
    const thu9 = days[1].points.find(p => p.time === '09:00')!;
    expect(thu9.observed).toBe(false);
    expect(thu9.heatIndex).toBe(33);
    expect(thu9.temperature).toBe(33);
  });

  it('ends early when the forecast run ends before now + 48 h', async () => {
    (fetchPointSeries as jest.Mock).mockImplementation(
      async (_family, _lat, _lng, t0: string, t1: string) =>
        seriesFrom(t0, t1, '2026110520'),
    );
    const days = await apiForecastProvider.getForecast({
      latitude: 22.3,
      longitude: 114.17,
    });
    const all = days.flatMap(d => d.points);
    expect(all).toHaveLength(45); // Wed 00:00 .. Thu 20:00
    expect(days).toHaveLength(2);
  });

  it('keeps the heat index chart when only the air temperature request fails', async () => {
    (fetchPointSeries as jest.Mock).mockImplementation(
      async (family: string, _lat, _lng, t0: string, t1: string) => {
        if (family === 'temperature') throw new Error('temperature down');
        return seriesFrom(t0, t1);
      },
    );

    const days = await apiForecastProvider.getForecast({
      latitude: 22.3,
      longitude: 114.17,
    });

    const all = days.flatMap(d => d.points);
    expect(all).toHaveLength(57); // 9 observed + 48 forecast
    expect(all.every(p => p.temperature === null)).toBe(true);
  });
});
