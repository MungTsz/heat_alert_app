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
