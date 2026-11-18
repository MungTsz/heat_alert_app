// src/utils/defaultMapLayer.ts
import { MapLayer } from '../types/mapSettings';
import { DEFAULT_MAP_LAYER_CONFIG } from '../config/mapLayerConfig';

// The layer every map opens on: always the Environmental Index, the same
// level Home's card leads with. Heat index and AQHI are details the user
// opens from the layer picker when they want them — the map no longer
// guesses which hazard to show from the readings. (Which hazard leads the
// card's words and the forecast sheet is still leadHazard; see
// utils/forecastHazard.ts.)
export const pickDefaultMapLayer = (): MapLayer => DEFAULT_MAP_LAYER_CONFIG.startLayer;
