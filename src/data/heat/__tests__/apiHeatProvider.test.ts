import { apiHeatProvider } from '../apiHeatProvider';
import {
  fetchLatestTime,
  fetchPointSeries,
  fetchPointValue,
} from '../../../services/spatialTempApi';

jest.mock('../../../services/spatialTempApi');

const VALUES: Record<string, number> = {
  temperature: 25.43,
  humidity: 83.4,
  'heat-index': 25.4,
};

describe('apiHeatProvider', () => {
  beforeEach(() => {
    (fetchLatestTime as jest.Mock).mockResolvedValue('2026110408');
    (fetchPointValue as jest.Mock).mockImplementation(
      async (family: string) => VALUES[family],
    );
  });

  it('returns temperature, RH and heat index all from the API for one shared hour', async () => {
    const conditions = await apiHeatProvider.getConditionsAt({
      latitude: 22.3,
      longitude: 114.17,
    });

    expect(conditions).toEqual({
      ts: '2026110408',
      temperatureC: 25.43,
      relativeHumidityPct: 83.4,
      heatIndexC: 25.4,
    });
    // Every family is queried at the same anchored hour, never the phone's clock.
    (fetchPointValue as jest.Mock).mock.calls.forEach(call => {
      expect(call.slice(1)).toEqual([22.3, 114.17, '2026110408']);
    });
  });

  describe('getHeatIndexHistoryAt', () => {
    const HOUR = 60 * 60 * 1000;
    // 2026-11-04 06:00 HKT
    const hkt6 = Date.UTC(2026, 10, 3, 22);
    const place = { latitude: 22.3, longitude: 114.17 };

    it('asks only up to the newest hour the API has, and returns its own values', async () => {
      (fetchPointSeries as jest.Mock).mockResolvedValue({
        ts: ['2026110406', '2026110407', '2026110408'],
        values: [29.1, 30.4, 31.2],
      });
      // The stay runs to 10:30, but the API's latest hour is 08:00.
      const series = await apiHeatProvider.getHeatIndexHistoryAt(place, hkt6, hkt6 + 4.5 * HOUR);
      expect((fetchPointSeries as jest.Mock).mock.calls[0]).toEqual([
        'heat-index',
        22.3,
        114.17,
        '2026110406',
        '2026110408',
      ]);
      expect(series).toEqual([
        { timestampMs: hkt6, value: 29.1 },
        { timestampMs: hkt6 + HOUR, value: 30.4 },
        { timestampMs: hkt6 + 2 * HOUR, value: 31.2 },
      ]);
    });

    it("returns nothing, without a request, when the API hasn't reached those hours", async () => {
      (fetchPointSeries as jest.Mock).mockClear();
      const series = await apiHeatProvider.getHeatIndexHistoryAt(
        place,
        hkt6 + 3 * HOUR,
        hkt6 + 4 * HOUR,
      );
      expect(series).toEqual([]);
      expect(fetchPointSeries).not.toHaveBeenCalled();
    });
  });

  it('propagates API errors instead of falling back to another source', async () => {
    (fetchPointValue as jest.Mock).mockRejectedValue(new Error('network down'));
    await expect(
      apiHeatProvider.getHeatIndexAt({ latitude: 22.3, longitude: 114.17 }),
    ).rejects.toThrow('network down');
  });
});
