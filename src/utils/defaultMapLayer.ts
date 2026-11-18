// src/utils/defaultMapLayer.ts
import { MapLayer } from '../types/mapSettings';
import { DEFAULT_MAP_LAYER_CONFIG } from '../config/mapLayerConfig';
import { HazardReadings, dominantHazard, seasonalHazard } from './enviUtils';

// The layer a map opens on — see DEFAULT_MAP_LAYER_CONFIG for the rules.
// It is the hazard that sets ENVI (dominantHazard, the same judgement Home's
// ENVI card rests on), so the map opens on whatever is driving the level
// the user just read. A missing reading (still loading, or unavailable)
// never beats an available one.
export const pickDefaultMapLayer = (params: {
  current: HazardReadings;
  praiseConfigured: boolean;
  nowMs: number;
}): MapLayer => {
  const { current, praiseConfigured, nowMs } = params;
  if (!praiseConfigured) return DEFAULT_MAP_LAYER_CONFIG.noPraiseLayer;
  return dominantHazard(current) ?? seasonalHazard(nowMs);
};
