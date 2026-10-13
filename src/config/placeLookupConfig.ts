// src/config/placeLookupConfig.ts
import Config from 'react-native-config';

// Public OSM endpoints used to name a newly added place. Both are fair-use
// services — overridable via .env so a self-hosted instance or a backend
// proxy can be swapped in without code changes once usage grows.
export const PLACE_LOOKUP_CONFIG = {
  nominatimBaseUrl: Config.NOMINATIM_BASE_URL || 'https://nominatim.openstreetmap.org',
  overpassUrl: Config.OVERPASS_API_URL || 'https://overpass-api.de/api/interpreter',
  // The public Overpass server is often busy and answers slowly or not at
  // all — keep this short so naming falls back to Nominatim quickly instead
  // of holding up the Save button.
  overpassTimeoutMs: Number(Config.OVERPASS_TIMEOUT_MS) || 6000,
  nominatimTimeoutMs: 8000,
  // Wait for the map to settle before looking up a name: dragging fires
  // many region changes, and Nominatim's policy allows ~1 request/second.
  lookupDebounceMs: 800,
  // Building-level reverse geocode — street number + road + nearest POI.
  nominatimZoom: 18,
  // Names come back in English to match the rest of the app's UI.
  language: 'en',
  userAgent: 'HeatAlertApp/1.0',
  // Lat/lng rounded to this many decimals (~11 m) keys the in-memory lookup
  // cache, so nudging the pin a little doesn't re-query.
  cacheCoordDecimals: 4,
};
