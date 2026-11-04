jest.mock('../../config/spatialTempConfig', () => ({
  SPATIAL_TEMP_CONFIG: {
    baseUrl: 'http://api.test:8001',
    timeoutMs: 1000,
    latestTimeCacheMs: 60000,
    forecastHorizonHours: 48,
    forecastFromHistory: true,
  },
}));

import {
  clipToDataFootprint,
  fetchAreaTile,
  fetchLatestTime,
  fetchPointSeries,
  fetchPointValue,
} from '../spatialTempApi';

const jsonResponse = (body: unknown) =>
  ({ ok: true, status: 200, json: () => Promise.resolve(body) }) as Response;

describe('spatialTempApi', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    globalThis.fetch = fetchMock;
  });

  it('reads the heat-index series from its snake_case key', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        status: 0,
        msg: null,
        ts: ['2026110407', '2026110408'],
        heat_index: [25.2, 25.4],
      }),
    );

    await expect(
      fetchPointSeries('heat-index', 22.3, 114.17, '2026110407', '2026110408'),
    ).resolves.toEqual({ ts: ['2026110407', '2026110408'], values: [25.2, 25.4] });

    expect(fetchMock.mock.calls[0][0]).toBe(
      'http://api.test:8001/heat-index/point?lat=22.3&lng=114.17&t0=2026110407&t1=2026110408',
    );
  });

  it('throws on status 1 even though the HTTP status is 200', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        status: 1,
        msg: 'No heat index data found for the specified time range.',
        ts: null,
        heat_index: null,
      }),
    );

    await expect(
      fetchPointValue('heat-index', 22.3, 114.17, '2026110410'),
    ).rejects.toThrow('No heat index data found');
  });

  it("rewrites the server's own host in PNG urls to the configured base URL", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        status: 0,
        msg: null,
        ts: '2026110408',
        param: 'heat_index',
        tiles: {
          lng0: 113.8195,
          lat0: 22.15,
          lng1: 114.4505,
          lat1: 22.58,
          url: ['http://localhost:8000/static/heat_index_2026110408_48235d58.png'],
        },
      }),
    );

    await expect(fetchAreaTile('heat-index', '2026110408')).resolves.toEqual({
      ts: '2026110408',
      uri: 'http://api.test:8001/static/heat_index_2026110408_48235d58.png',
      bounds: [
        [22.58, 114.4505],
        [22.15, 113.8195],
      ],
    });
    // No bbox → whole map: the API wants all four corners or none.
    expect(fetchMock.mock.calls[0][0]).toBe(
      'http://api.test:8001/heat-index/area?ts=2026110408',
    );
  });

  it('shares one /latest request between concurrent callers', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ status: 0, msg: null, latest_time: '2026110408' }),
    );

    const [a, b] = await Promise.all([
      fetchLatestTime('humidity'),
      fetchLatestTime('humidity'),
    ]);

    expect(a).toBe('2026110408');
    expect(b).toBe('2026110408');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('trims a map box to the data footprint so no white out-of-bound pixels are requested', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.includes('/latest')
        ? jsonResponse({ status: 0, msg: null, latest_time: '2026110409' })
        : jsonResponse({
            status: 0,
            msg: null,
            ts: '2026110409',
            param: 'heat_index',
            tiles: {
              lng0: 113.8195,
              lat0: 22.15,
              lng1: 114.4505,
              lat1: 22.58,
              url: ['http://hqlx188.ust.hk:8000/static/full.png'],
            },
          }),
    );

    // Box sticking out past the east and south edges → clipped to them
    await expect(
      clipToDataFootprint('heat-index', {
        lng0: 114.3,
        lat0: 22.1,
        lng1: 114.6,
        lat1: 22.3,
      }),
    ).resolves.toEqual({ lng0: 114.3, lat0: 22.15, lng1: 114.4505, lat1: 22.3 });

    // Box entirely outside → no data at all
    await expect(
      clipToDataFootprint('heat-index', {
        lng0: 114.6,
        lat0: 22.1,
        lng1: 114.8,
        lat1: 22.3,
      }),
    ).resolves.toBeNull();

    // The footprint is looked up once and reused
    const areaCalls = fetchMock.mock.calls.filter(([url]) =>
      String(url).includes('/area'),
    );
    expect(areaCalls).toHaveLength(1);
    expect(areaCalls[0][0]).toBe(
      'http://api.test:8001/heat-index/area?ts=2026110409',
    );
  });

  it('does not cache a failed /latest lookup', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(
        jsonResponse({ status: 0, msg: null, latest_time: '2026110408' }),
      );

    await expect(fetchLatestTime('temperature')).rejects.toThrow('network down');
    await expect(fetchLatestTime('temperature')).resolves.toBe('2026110408');
  });
});
