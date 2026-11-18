// src/utils/defaultMapLayer.ts
import { MapLayer } from '../types/mapSettings';
import { DEFAULT_MAP_LAYER_CONFIG } from '../config/mapLayerConfig';
import { HazardReadings, leadHazard } from './enviUtils';

// The layer a map opens on — see DEFAULT_MAP_LAYER_CONFIG for the rules.
// It is the hazard that sets the Environmental Index (leadHazard, the same
// judgement Home's card and its detail sheet rest on), so the map opens on
// whatever is driving the level the user just read. A missing reading (still loading, or unavailable)
// never beats an available one.
export const pickDefaultMapLayer = (params: {
  current: HazardReadings;
  praiseConfigured: boolean;
  nowMs: number;
}): MapLayer => {
  const { current, praiseConfigured, nowMs } = params;
  if (!praiseConfigured) return DEFAULT_MAP_LAYER_CONFIG.noPraiseLayer;
  return leadHazard(current, nowMs);
};
