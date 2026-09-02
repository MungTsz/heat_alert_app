import { fetchHkoCurrentWeather } from '../hkoApi';

const mockRhrread = {
  temperature: {
    data: [
      { place: "King's Park", value: 29, unit: 'C' },
      { place: 'Hong Kong Observatory', value: 28, unit: 'C' },
    ],
    recordTime: '2026-09-02T11:00:00+08:00',
  },
  humidity: {
    data: [{ place: 'Hong Kong Observatory', value: 77, unit: 'percent' }],
    recordTime: '2026-09-02T11:00:00+08:00',
  },
};

describe('fetchHkoCurrentWeather', () => {
  beforeEach(() => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockRhrread,
    }) as any;
  });

  it("picks the configured station's temperature and the single humidity reading", async () => {
    const result = await fetchHkoCurrentWeather();
    expect(result).toEqual({ temperatureC: 28, relativeHumidityPct: 77 });
  });

  it('throws when the response is missing temperature/humidity data', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ temperature: { data: [] }, humidity: { data: [] } }),
    }) as any;
    await expect(fetchHkoCurrentWeather()).rejects.toThrow();
  });

  it('throws when the HTTP response is not ok', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 }) as any;
    await expect(fetchHkoCurrentWeather()).rejects.toThrow();
  });
});
