// src/hooks/useDefaultMapLayer.ts
import { MapLayer } from '../types/mapSettings';
import { isPraiseConfigured } from '../config/praiseConfig';
import { pickDefaultMapLayer } from '../utils/defaultMapLayer';
import { HazardReadings } from '../utils/enviUtils';

// The hazard layer a map opens on, for every screen that shows a map —
// from the values the screen already has (the user's location on Home, a
// saved place's own values on that place's map), so no extra lookups.
export const useDefaultMapLayer = (current: HazardReadings): MapLayer =>
  pickDefaultMapLayer({
    current,
    praiseConfigured: isPraiseConfigured(),
    nowMs: Date.now(),
  });
