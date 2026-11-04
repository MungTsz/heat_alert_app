import { apiHeatProvider } from '../apiHeatProvider';
import {
  fetchLatestTime,
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

  it('propagates API errors instead of falling back to another source', async () => {
    (fetchPointValue as jest.Mock).mockRejectedValue(new Error('network down'));
    await expect(
      apiHeatProvider.getHeatIndexAt({ latitude: 22.3, longitude: 114.17 }),
    ).rejects.toThrow('network down');
  });
});
