// src/utils/enviUtils.ts
import { HazardKind } from '../types/alerts';
import { HAZARD_KINDS } from '../config/alertConfig';
import { ENVI_LEVELS } from '../config/enviConfig';
import { DEFAULT_MAP_LAYER_CONFIG } from '../config/mapLayerConfig';
import { rankOf } from './hazardLevels';
import { toHkDateKey } from './hkDate';

// Both hazards' current values at one place; null = loading / unavailable.
export type HazardReadings = Record<HazardKind, number | null>;

export type EnviLevelInfo = (typeof ENVI_LEVELS)[number];

// Each hazard's own level 1-5 (null when unavailable). Always rankOf() + 1,
// so the level tables stay defined only in heatIndexUtils.ts / aqhiUtils.ts
// and ENVI can never classify a reading differently from the cards, the map
// and the alert engine.
export const hazardLevelOf = (hazard: HazardKind, value: number | null): number | null =>
  value === null || Number.isNaN(value) ? null : rankOf(hazard, value) + 1;

// ENVI: the higher of the two hazards' levels (1-5). With only one reading
// it is that hazard's level; null when neither is available, so the screen
// shows "--" rather than a made-up "1 Low".
export const getEnviLevel = (current: HazardReadings): number | null => {
  const levels = HAZARD_KINDS.map(hazard => hazardLevelOf(hazard, current[hazard])).filter(
    (level): level is number => level !== null,
  );
  return levels.length === 0 ? null : Math.max(...levels);
};

// The hazard with the higher level; null on a tie or when both are missing.
// A missing reading never wins over an available one.
export const dominantHazard = (current: HazardReadings): HazardKind | null => {
  const heat = hazardLevelOf('heat', current.heat);
  const aqhi = hazardLevelOf('aqhi', current.aqhi);
  if (heat === null) return aqhi === null ? null : 'aqhi';
  if (aqhi === null) return 'heat';
  if (heat === aqhi) return null;
  return heat > aqhi ? 'heat' : 'aqhi';
};

// Name and colours of an ENVI level (1-5).
export const getEnviLevelInfo = (level: number): EnviLevelInfo =>
  ENVI_LEVELS[Math.max(1, Math.min(level, ENVI_LEVELS.length)) - 1];

// Month 1-12 on the Hong Kong calendar, whatever the phone's own timezone.
const hkMonthOf = (nowMs: number): number => Number(toHkDateKey(new Date(nowMs)).slice(5, 7));

// The season's usual concern — the tie-break wherever the two hazards are
// level (which map layer opens, whose suggestion ENVI shows): AQHI in
// winter and spring, heat in the hot season (DEFAULT_MAP_LAYER_CONFIG).
export const seasonalHazard = (nowMs: number): HazardKind =>
  DEFAULT_MAP_LAYER_CONFIG.aqhiSeasonMonths.includes(hkMonthOf(nowMs))
    ? 'aqhi'
    : DEFAULT_MAP_LAYER_CONFIG.seasonFallbackLayer;
