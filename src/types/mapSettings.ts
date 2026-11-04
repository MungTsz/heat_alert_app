// GoogleMapType is intentionally narrowed to what the Settings UI exposes —
// 'standard' (Google's default light map) and 'hybrid' (satellite imagery
// with street/building labels layered on top), see SettingsScreen "MAP DISPLAY".
export type GoogleMapType = 'standard' | 'hybrid';

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

// One frame of a hazard layer's map animation. Shared by every layer so
// MapScreen plays heat and AQHI forecasts through the exact same code.
export type MapForecastFrame = MapTile & {
  ts: string; // YYYYMMDDhh, HKT — the hour this frame shows
  hourOffset: number; // 0 = now .. MAP_LAYER_CONFIG.forecastHours
};
