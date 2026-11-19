// src/services/spatialTempApi.ts
import { SPATIAL_TEMP_CONFIG } from '../config/spatialTempConfig';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import { toHkTimestamp } from '../utils/hkDate';
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

// The hour every "now" value is read at: the phone's HK clock rounded down
// to the hour (12:15 → the 12:00 data); every later hour is forecast. The
// API serves one continuous hourly timeline — past hours and about 8 days
// of forecast — so /latest is now the *end of the forecast*, never "now",
// and must not be used as an anchor. If the current hour is missing, the
// lookup fails (status 1) and the screen shows "--" rather than an older
// or later hour standing in for it.
export const currentDataHour = (now: Date = new Date()): string =>
  toHkTimestamp(now);

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

const footprintCache = new Map<SpatialTempFamily, Promise<SpatialTempBounds>>();

// The box the API actually has data for. Read from the API itself (an /area
// call with no bbox returns the full footprint) rather than hardcoded, and
// cached for the session since the grid doesn't move.
const fetchDataFootprint = (
  family: SpatialTempFamily,
): Promise<SpatialTempBounds> => {
  const cached = footprintCache.get(family);
  if (cached) return cached;
  const promise = getJson(`/${family}/area`, { ts: currentDataHour() })
    .then(data => {
      const { lng0, lat0, lng1, lat1 } = data.tiles;
      return { lng0, lat0, lng1, lat1 };
    });
  footprintCache.set(family, promise);
  promise.catch(() => footprintCache.delete(family));
  return promise;
};

// Trims a map box to the data footprint before requesting a PNG. Any part of
// a box outside the footprint comes back as opaque white pixels, which would
// lay a white veil over the map when zoomed out or panned to the edge —
// trimming first means the server never draws them, and the overlay only
// covers where there is data. null = the box has no data at all.
export const clipToDataFootprint = async (
  family: SpatialTempFamily,
  bounds: SpatialTempBounds,
): Promise<SpatialTempBounds | null> => {
  const footprint = await fetchDataFootprint(family);
  const clipped = {
    lng0: Math.max(bounds.lng0, footprint.lng0),
    lat0: Math.max(bounds.lat0, footprint.lat0),
    lng1: Math.min(bounds.lng1, footprint.lng1),
    lat1: Math.min(bounds.lat1, footprint.lat1),
  };
  return clipped.lng0 < clipped.lng1 && clipped.lat0 < clipped.lat1
    ? clipped
    : null;
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
