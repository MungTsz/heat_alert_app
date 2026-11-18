import type { HazardKind } from './alerts';

// GoogleMapType is intentionally narrowed to what App settings exposes —
// 'standard' (Google's default light map) and 'hybrid' (satellite imagery
// with street/building labels layered on top).
export type GoogleMapType = 'standard' | 'hybrid';

// A map always shows one of three layers — there is no plain map:
// - 'envi': the Environmental Index, the layer every map opens on
//   (DEFAULT_MAP_LAYER_CONFIG.startLayer), matching the card on Home;
// - 'heat' / 'aqhi': the two peer hazards, the detail layers under the
//   layer picker's "View details".
// 'envi' is its own layer, not a renamed hazard: it has its own tile source
// (ENVI_MAP_SOURCE), legend and pins.
export type MapLayer = HazardKind | 'envi';

export type MapSettings = {
  mapType: GoogleMapType;
};

export const DEFAULT_MAP_SETTINGS: MapSettings = {
  mapType: 'standard',
};

// [northEast, southWest] [lat, lng] pairs — matches react-native-maps Overlay.
export type MapOverlayBounds = [[number, number], [number, number]];

export type MapTile = {
  uri: string;
  bounds: MapOverlayBounds;
};

// One frame of a map layer's animation. Shared by every layer so MapScreen
// plays heat, AQHI and Environmental Index forecasts through the exact same
// code.
export type MapForecastFrame = MapTile & {
  ts: string; // YYYYMMDDhh, HKT — the hour this frame shows
  hourOffset: number; // 0 = now .. MAP_LAYER_CONFIG.forecastHours
};
