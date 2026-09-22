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

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCachedRoute, setCachedRoute, MAX_CACHED_ROUTES, FALLBACK_ROUTE_CACHE_TTL_MS } from '../routeCacheService';

describe('routeCacheService', () => {
  beforeEach(() => {
    mockStore.clear();
  });

  it('round-trips a cached route', async () => {
    await setCachedRoute('a|b', {
      coordinates: [{ latitude: 22.3, longitude: 114.2 }],
      isFallback: false,
    });

    const cached = await getCachedRoute('a|b');
    expect(cached?.coordinates).toEqual([{ latitude: 22.3, longitude: 114.2 }]);
    expect(cached?.isFallback).toBe(false);
  });

  it('returns null for a key that was never cached', async () => {
    expect(await getCachedRoute('never-cached')).toBeNull();
  });

  it('degrades to an empty cache when the stored JSON is corrupt', async () => {
    mockStore.set('exposure_route_cache', '{not valid json');
    expect(await getCachedRoute('a|b')).toBeNull();
  });

  it('expires a fallback entry past its TTL but keeps a successful one', async () => {
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now - FALLBACK_ROUTE_CACHE_TTL_MS - 1000);
    await setCachedRoute('fallback-pair', { coordinates: [], isFallback: true });
    await setCachedRoute('good-pair', {
      coordinates: [{ latitude: 22.3, longitude: 114.2 }],
      isFallback: false,
    });
    (Date.now as jest.Mock).mockReturnValue(now);

    expect(await getCachedRoute('fallback-pair')).toBeNull();
    expect(await getCachedRoute('good-pair')).not.toBeNull();

    (Date.now as jest.Mock).mockRestore();
  });

  it('evicts the oldest entries once over the cache size cap', async () => {
    const now = Date.now();
    const dateNowSpy = jest.spyOn(Date, 'now');
    for (let i = 0; i < MAX_CACHED_ROUTES + 5; i++) {
      dateNowSpy.mockReturnValue(now + i);
      await setCachedRoute(`pair-${i}`, {
        coordinates: [{ latitude: 22.3, longitude: 114.2 }],
        isFallback: false,
      });
    }
    dateNowSpy.mockRestore();

    expect(await getCachedRoute('pair-0')).toBeNull();
    expect(await getCachedRoute(`pair-${MAX_CACHED_ROUTES + 4}`)).not.toBeNull();

    const raw = await AsyncStorage.getItem('exposure_route_cache');
    expect(Object.keys(JSON.parse(raw as string))).toHaveLength(MAX_CACHED_ROUTES);
  });
});
