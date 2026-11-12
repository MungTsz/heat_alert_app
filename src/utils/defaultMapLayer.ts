// src/utils/defaultMapLayer.ts
import { HazardKind, PlaceAlertProfile } from '../types/alerts';
import { MapLayer } from '../types/mapSettings';
import { HAZARD_KINDS } from '../config/alertConfig';
import { DEFAULT_MAP_LAYER_CONFIG } from '../config/mapLayerConfig';
import { rankOf } from './hazardLevels';
import { alertRankFor } from './alertProfile';
import { toHkDateKey } from './hkDate';

// Month 1-12 on the Hong Kong calendar, whatever the phone's own timezone.
const hkMonthOf = (nowMs: number): number => Number(toHkDateKey(new Date(nowMs)).slice(5, 7));

// The layer a map opens on — see DEFAULT_MAP_LAYER_CONFIG for the rules.
// "Reached" is judged exactly as the alert engine judges it (alertSignals:
// the reading's level rank against the profile's alert rank), so the map
// opens on the same hazard a notification would be about. A hazard the
// profile switched off never counts, and a missing reading (still loading,
// or unavailable) never counts as reached.
export const pickDefaultMapLayer = (params: {
  current: Record<HazardKind, number | null>;
  profile: PlaceAlertProfile;
  praiseConfigured: boolean;
  nowMs: number;
}): MapLayer => {
  const { current, profile, praiseConfigured, nowMs } = params;
  if (!praiseConfigured) return DEFAULT_MAP_LAYER_CONFIG.noPraiseLayer;

  const reached = HAZARD_KINDS.filter(hazard => {
    const value = current[hazard];
    return (
      profile.hazards[hazard] &&
      value !== null &&
      rankOf(hazard, value) >= alertRankFor(profile, hazard)
    );
  });
  if (reached.length === 1) return reached[0];

  return DEFAULT_MAP_LAYER_CONFIG.aqhiSeasonMonths.includes(hkMonthOf(nowMs))
    ? 'aqhi'
    : DEFAULT_MAP_LAYER_CONFIG.seasonFallbackLayer;
};
