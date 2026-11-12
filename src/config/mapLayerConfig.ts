import type { GoogleMapType, MapLayer } from '../types/mapSettings';

// The base map styles, in the order both places that offer them list them:
// the map's own layer picker and App settings (one stored value, via the
// shared useMapSettings).
export const MAP_TYPE_OPTIONS: readonly { key: GoogleMapType; label: string }[] = [
  { key: 'standard', label: 'Default' },
  { key: 'hybrid', label: 'Satellite' },
];

// Map hazard-layer behavior shared by every layer (heat index, AQHI). One
// set of values on purpose: the layers must look and behave the same —
// same forecast length, same playback speed, same starting opacity — so
// switching layers only changes the data, never the experience.
export const MAP_LAYER_CONFIG = {
  // Hours of forecast frames after "now" in the map animation.
  forecastHours: 6,
  frameIntervalMs: 700,
  // Starting value of the layer-opacity slider.
  defaultOpacity: 0.55,
};

// Which hazard layer a map opens on (useDefaultMapLayer). There is no plain
// map: one without either layer shows none of this app's data, wasting the
// first look. In order:
// 1. the hazard that has reached the user's alert level right now;
// 2. on a tie (both or neither), the season's usual concern;
// 3. heat whenever AQHI can't show real data (PRAISE not configured) —
//    rule 3 is checked first, since it overrides the other two.
export const DEFAULT_MAP_LAYER_CONFIG = {
  // Hong Kong calendar months (1-12) that default to AQHI on a tie: winter
  // and spring, when regional haze peaks. The rest (June-November, the hot
  // season) default to heat index.
  aqhiSeasonMonths: [12, 1, 2, 3, 4, 5] as readonly number[],
  seasonFallbackLayer: 'heat' as MapLayer,
  // Without PRAISE the AQHI layer would show mock data, so it never opens on it.
  noPraiseLayer: 'heat' as MapLayer,
};

// Saved places drawn on the map (Home's preview and full-screen map). A
// smaller, grey pin than the tapped point's blue one, so "my places" and
// "the spot I'm looking at" never read as the same thing.
export const MAP_PLACE_PIN_CONFIG = {
  iconSize: 28,
  color: '#5B5B5B',
};

// The tapped point's pin.
export const MAP_POINT_PIN_CONFIG = {
  iconSize: 42,
  color: '#2B7A9E',
};
