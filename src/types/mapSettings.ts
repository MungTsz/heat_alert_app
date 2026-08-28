// src/types/mapSettings.ts
export type GoogleMapType = 'standard' | 'satellite' | 'terrain' | 'hybrid';

export type MapSettings = {
  mapType: GoogleMapType;
  show3DBuildings: boolean;
};

export const DEFAULT_MAP_SETTINGS: MapSettings = {
  mapType: 'standard',
  show3DBuildings: false,
};
