// src/services/placeLookupService.ts
import { PLACE_LOOKUP_CONFIG } from '../config/placeLookupConfig';
import { EnclosingArea, OsmTags, PlaceContext } from '../types/placeLookup';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import { reverseGeocode } from '../utils/geocode';

type OverpassElement = {
  tags?: OsmTags;
  bounds?: { minlat: number; minlon: number; maxlat: number; maxlon: number };
};

// Every named way/relation whose area contains the point, with its bounding
// box. Nominatim's reverse geocode alone can't answer this: inside a campus
// it returns the nearest café or footpath, never the campus itself — which
// is exactly the name a "School" should get.
const buildIsInQuery = (lat: number, lng: number): string =>
  `[out:json][timeout:${Math.ceil(PLACE_LOOKUP_CONFIG.overpassTimeoutMs / 1000)}];` +
  `is_in(${lat},${lng})->.a;` +
  '(way(pivot.a)[name];relation(pivot.a)[name];);' +
  'out tags bb;';

const toEnclosingArea = (element: OverpassElement): EnclosingArea | null => {
  if (!element.tags) return null;
  const b = element.bounds;
  return {
    tags: element.tags,
    areaDeg2: b ? Math.abs((b.maxlat - b.minlat) * (b.maxlon - b.minlon)) : null,
  };
};

// Returns null on any failure (vs [] for "nothing named here") — the public
// server is frequently too busy and answers with an HTML error page or a
// JSON `remark` instead of elements.
const fetchEnclosingAreas = async (
  lat: number,
  lng: number,
): Promise<EnclosingArea[] | null> => {
  try {
    const response = await fetchWithTimeout(
      PLACE_LOOKUP_CONFIG.overpassUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': PLACE_LOOKUP_CONFIG.userAgent,
        },
        body: `data=${encodeURIComponent(buildIsInQuery(lat, lng))}`,
      },
      PLACE_LOOKUP_CONFIG.overpassTimeoutMs,
    );
    if (!response.ok) return null;
    const data = await response.json();
    if (!Array.isArray(data?.elements) || data.remark) return null;
    return (data.elements as OverpassElement[])
      .map(toEnclosingArea)
      .filter((area): area is EnclosingArea => area !== null);
  } catch (error) {
    console.log('Overpass lookup failed:', error);
    return null;
  }
};

const cache = new Map<string, Promise<PlaceContext>>();

const cacheKey = (lat: number, lng: number): string =>
  `${lat.toFixed(PLACE_LOOKUP_CONFIG.cacheCoordDecimals)},${lng.toFixed(
    PLACE_LOOKUP_CONFIG.cacheCoordDecimals,
  )}`;

// Everything needed to name a picked point. Both sources run in parallel
// and either may come back empty; naming degrades to whatever is left. The
// promise itself is cached so re-settling the map on the same spot (or two
// lookups racing) costs one request pair, not several.
export const lookupPlaceContext = (lat: number, lng: number): Promise<PlaceContext> => {
  const key = cacheKey(lat, lng);
  const cached = cache.get(key);
  if (cached) return cached;

  const pending = Promise.all([
    fetchEnclosingAreas(lat, lng),
    reverseGeocode(lat, lng, {
      zoom: PLACE_LOOKUP_CONFIG.nominatimZoom,
      language: PLACE_LOOKUP_CONFIG.language,
      nameDetails: true,
    }),
  ]).then(([enclosingAreas, reverse]) => {
    // Only a fully successful answer is kept: if either source failed (busy
    // server, offline), settling the map here again should get a fresh try
    // at the better name instead of a pinned fallback.
    if (enclosingAreas === null || !reverse) cache.delete(key);
    return { enclosingAreas: enclosingAreas ?? [], reverse };
  });
  cache.set(key, pending);
  return pending;
};

// Human-readable address stored with the place (shown on its map sheet).
export const formatPlaceAddress = (context: PlaceContext, lat: number, lng: number): string =>
  context.reverse?.displayName ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
