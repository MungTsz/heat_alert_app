import { apiHeatProvider } from '../apiHeatProvider';
import { fetchHkoCurrentWeather } from '../../../services/hkoApi';

jest.mock('../../../services/hkoApi');

describe('apiHeatProvider.getHeatPoints', () => {
  it('returns multiple points around the center, all sharing the computed heat index', async () => {
    (fetchHkoCurrentWeather as jest.Mock).mockResolvedValue({
      temperatureC: 32,
      relativeHumidityPct: 75,
    });

    const center = { latitude: 22.3, longitude: 114.17 };
    const points = await apiHeatProvider.getHeatPoints(center);

    expect(points.length).toBeGreaterThan(1);
    const values = new Set(points.map(p => p.temperature));
    expect(values.size).toBe(1); // every point shares the same heat index

    points.forEach(p => {
      expect(Math.abs(p.latitude - center.latitude)).toBeLessThan(0.5);
      expect(Math.abs(p.longitude - center.longitude)).toBeLessThan(0.5);
    });
  });

  it('propagates errors from the HKO fetch (no mock fallback, per product decision)', async () => {
    (fetchHkoCurrentWeather as jest.Mock).mockRejectedValue(
      new Error('network down'),
    );
    await expect(
      apiHeatProvider.getHeatPoints({ latitude: 22.3, longitude: 114.17 }),
    ).rejects.toThrow('network down');
  });
});
