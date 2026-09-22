import AsyncStorage from '@react-native-async-storage/async-storage';
import { LatLng } from '../utils/googlePolyline';

const CACHE_KEY = 'exposure_route_cache';

// Bounds cache size — entries accumulate incrementally across a long-lived
// app session (unlike exposureHistoryService.ts's cache, which is rewritten
// wholesale on each refresh), so eviction happens per-write, not per-refresh.
export const MAX_CACHED_ROUTES = 500;

// A "no route" result might be a transient API hiccup/timeout rather than a
// permanent geographic fact, so it's re-checked after this window instead of
// being cached forever like a successful route is.
export const FALLBACK_ROUTE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type CachedRouteEntry = {
  coordinates: LatLng[];
  isFallback: boolean;
  cachedAt: number;
};

type RouteCacheMap = Record<string, CachedRouteEntry>;

const readCache = async (): Promise<RouteCacheMap> => {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.log('Failed to read cached routes:', error);
    return {};
  }
};

const writeCache = async (map: RouteCacheMap): Promise<void> => {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(map));
  } catch (error) {
    console.log('Failed to cache route:', error);
  }
};

export const getCachedRoute = async (key: string): Promise<CachedRouteEntry | null> => {
  const cache = await readCache();
  const entry = cache[key];
  if (!entry) return null;
  if (entry.isFallback && Date.now() - entry.cachedAt > FALLBACK_ROUTE_CACHE_TTL_MS) {
    return null;
  }
  return entry;
};

export const setCachedRoute = async (
  key: string,
  entry: Omit<CachedRouteEntry, 'cachedAt'>,
): Promise<void> => {
  const cache = await readCache();
  cache[key] = { ...entry, cachedAt: Date.now() };

  const keys = Object.keys(cache);
  if (keys.length > MAX_CACHED_ROUTES) {
    const oldestFirst = keys.sort((a, b) => cache[a].cachedAt - cache[b].cachedAt);
    for (const staleKey of oldestFirst.slice(0, keys.length - MAX_CACHED_ROUTES)) {
      delete cache[staleKey];
    }
  }

  await writeCache(cache);
};
