// src/services/spatialTempApi.ts
import { SPATIAL_TEMP_CONFIG } from '../config/spatialTempConfig';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import { MapOverlayBounds } from '../types/mapSettings';

export type SpatialTempFamily = 'temperature' | 'humidity' | 'heat-index';

// /point returns its series under a per-family key (heat-index's is
// snake_case), so map each family to where its values live.
const POINT_VALUE_KEY: Record<SpatialTempFamily, string> = {
  temperature: 'temperature',
  humidity: 'humidity',
  'heat-index': 'heat_index',
};

export type SpatialTempBounds = {
  lng0: number;
  lat0: number;
  lng1: number;
  lat1: number;
};

export type PointSeries = {
  ts: string[]; // YYYYMMDDhh, HKT
  values: number[];
};

export type AreaTile = {
  ts: string;
  uri: string;
  bounds: MapOverlayBounds;
};

// Every JSON endpoint answers HTTP 200 and signals errors via status !== 0,
// so the HTTP code alone can't be trusted. A non-null msg on success is a
// warning (e.g. "Partially out of bound") — worth logging, not failing on.
const getJson = async (path: string, params: Record<string, string> = {}) => {
  const query = new URLSearchParams(params).toString();
  const url = `${SPATIAL_TEMP_CONFIG.baseUrl}${path}${query ? `?${query}` : ''}`;
  const response = await fetchWithTimeout(url, {}, SPATIAL_TEMP_CONFIG.timeoutMs);
  if (!response.ok) {
    throw new Error(`Spatial temp API ${path} failed: HTTP ${response.status}`);
  }
  const data = await response.json();
  if (data.status !== 0) {
    throw new Error(data.msg ?? `Spatial temp API ${path} failed`);
  }
  if (data.msg) console.log(`Spatial temp API ${path} warning:`, data.msg);
  return data;
};

// The server bakes its own host into PNG urls (http://localhost:8000/... when
// reached through a tunnel), which the phone can't resolve if we reach it
// on a different host/port — so keep only the path and join it to our
// configured base URL.
const toAppReachableUrl = (serverUrl: string): string =>
  serverUrl.replace(/^https?:\/\/[^/]+/, SPATIAL_TEMP_CONFIG.baseUrl);

const toAreaTile = (
  ts: string,
  box: SpatialTempBounds,
  url: string,
): AreaTile => ({
  ts,
  uri: toAppReachableUrl(url),
  bounds: [
    [box.lat1, box.lng1], // northEast
    [box.lat0, box.lng0], // southWest
  ],
});

const latestTimeCache = new Map<
  SpatialTempFamily,
  { fetchedAt: number; promise: Promise<string> }
>();

// The newest hour the pipeline has produced. Always anchor queries on this
// rather than the phone's clock: data lands an hour or two late, and asking
// for "now" returns status 1 ("No ... data found").
export const fetchLatestTime = (family: SpatialTempFamily): Promise<string> => {
  const cached = latestTimeCache.get(family);
  if (
    cached &&
    Date.now() - cached.fetchedAt < SPATIAL_TEMP_CONFIG.latestTimeCacheMs
  ) {
    return cached.promise;
  }
  // Caches the in-flight promise too, so screens mounting together share a
  // single request; a failure is evicted so the next caller retries.
  const promise = getJson(`/${family}/latest`).then(
    data => data.latest_time as string,
  );
  latestTimeCache.set(family, { fetchedAt: Date.now(), promise });
  promise.catch(() => latestTimeCache.delete(family));
  return promise;
};

// Hourly series at one coordinate, t0..t1 inclusive (YYYYMMDDhh, HKT).
export const fetchPointSeries = async (
  family: SpatialTempFamily,
  lat: number,
  lng: number,
  t0: string,
  t1: string,
): Promise<PointSeries> => {
  const data = await getJson(`/${family}/point`, {
    lat: lat.toString(),
    lng: lng.toString(),
    t0,
    t1,
  });
  return { ts: data.ts, values: data[POINT_VALUE_KEY[family]] };
};

// Single value at one coordinate for one hour.
export const fetchPointValue = async (
  family: SpatialTempFamily,
  lat: number,
  lng: number,
  ts: string,
): Promise<number> => {
  const { values } = await fetchPointSeries(family, lat, lng, ts, ts);
  if (typeof values?.[0] !== 'number') {
    throw new Error(`Spatial temp API returned no ${family} value for ${ts}`);
  }
  return values[0];
};

// Coloured PNG for one hour. Omitting bounds returns the whole data
// footprint (the API requires all four corners or none).
export const fetchAreaTile = async (
  family: SpatialTempFamily,
  ts: string,
  bounds?: SpatialTempBounds,
): Promise<AreaTile> => {
  const params: Record<string, string> = { ts };
  if (bounds) {
    params.lng0 = bounds.lng0.toString();
    params.lat0 = bounds.lat0.toString();
    params.lng1 = bounds.lng1.toString();
    params.lat1 = bounds.lat1.toString();
  }
  const data = await getJson(`/${family}/area`, params);
  // tiles.url is an array (unlike PRAISE's single string); one bbox → one PNG.
  return toAreaTile(data.ts, data.tiles, data.tiles.url[0]);
};

// One PNG per hour t0..t1 for the same box — a whole map animation in one
// request instead of one /area call per frame. Hours the API has no data for
// are simply absent from the result.
export const fetchAreaTimeseries = async (
  family: SpatialTempFamily,
  t0: string,
  t1: string,
  bounds: SpatialTempBounds,
): Promise<AreaTile[]> => {
  const data = await getJson(`/${family}/area/timeseries`, {
    t0,
    t1,
    lng0: bounds.lng0.toString(),
    lat0: bounds.lat0.toString(),
    lng1: bounds.lng1.toString(),
    lat1: bounds.lat1.toString(),
  });
  return data.bbox.frames.map((frame: { ts: string; url: string }) =>
    toAreaTile(frame.ts, data.bbox, frame.url),
  );
};
