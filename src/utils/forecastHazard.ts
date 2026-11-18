// src/utils/forecastHazard.ts
import { HazardKind } from '../types/alerts';
import { DEFAULT_MAP_LAYER_CONFIG } from '../config/mapLayerConfig';
import { HazardReadings, leadHazard } from './enviUtils';

// The hazard tab the Environmental Index forecast sheet opens on: the hazard
// that sets the index (leadHazard — the same judgement the card's keywords
// and summary rest on), or the season's on a tie. Heat whenever PRAISE
// isn't configured, since there is no AQHI forecast to show. A missing
// reading (still loading, or unavailable) never beats an available one.
export const pickForecastHazard = (params: {
  current: HazardReadings;
  praiseConfigured: boolean;
  nowMs: number;
}): HazardKind => {
  const { current, praiseConfigured, nowMs } = params;
  if (!praiseConfigured) return DEFAULT_MAP_LAYER_CONFIG.noPraiseLayer;
  return leadHazard(current, nowMs);
};
