// src/utils/enviAdvice.ts
import { HazardKind } from '../types/alerts';
import { HAZARD_KINDS } from '../config/alertConfig';
import { AQHI_LEVEL_SUGGESTION, DUAL_ADVICE, HEAT_LEVEL_SUGGESTION } from '../config/alertCopy';
import { ENVI_CONFIG } from '../config/enviConfig';
import { levelOf } from './hazardLevels';
import {
  HazardReadings,
  dominantHazard,
  getEnviLevel,
  hazardLevelOf,
  seasonalHazard,
} from './enviUtils';

const LEVEL_SUGGESTION: Record<HazardKind, Record<string, string>> = {
  heat: HEAT_LEVEL_SUGGESTION,
  aqhi: AQHI_LEVEL_SUGGESTION,
};

// One hazard's suggestion at its current level. null when the reading is
// unavailable or at the lowest level, which needs no message.
export const hazardSuggestionFor = (hazard: HazardKind, value: number | null): string | null =>
  value === null ? null : LEVEL_SUGGESTION[hazard][levelOf(hazard, value)] ?? null;

// The one sentence under ENVI on days without an alert. null at level 1 or
// with no readings. `nowMs` only settles a tie, by season.
export const enviAdviceFor = (
  current: HazardReadings,
  nowMs: number = Date.now(),
): string | null => {
  // Poor air and heat together is not both lists of advice — opening a
  // window for the heat lets polluted air in — so it has its own sentence.
  const bothHigh = HAZARD_KINDS.every(hazard => {
    const level = hazardLevelOf(hazard, current[hazard]);
    return level !== null && level >= ENVI_CONFIG.dualAdviceMinLevel;
  });
  if (bothHigh) return DUAL_ADVICE.self;

  const envi = getEnviLevel(current);
  if (envi === null || envi < ENVI_CONFIG.adviceMinLevel) return null;

  // Otherwise the higher hazard speaks; when they are level, the season's.
  const lead = dominantHazard(current) ?? seasonalHazard(nowMs);
  return hazardSuggestionFor(lead, current[lead]);
};
