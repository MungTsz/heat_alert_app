// src/utils/enviKeywords.ts
import { HAZARD_KINDS } from '../config/alertConfig';
import { ENVI_WARNING_COPY } from '../config/alertCopy';
import { ENVI_CONFIG } from '../config/enviConfig';
import {
  ENVI_CALM_ACTIONS,
  ENVI_DUAL_ACTIONS,
  ENVI_HAZARD_ACTIONS,
  ENVI_KEYWORD_LIMITS,
} from '../config/enviKeywords';
import { EnviActionId } from '../types/envi';
import { levelOf } from './hazardLevels';
import { HazardReadings, getEnviLevel, hazardLevelOf, leadHazard } from './enviUtils';

export type EnviKeywords = {
  // Warning chips, in order (two only when both hazards are high).
  warnings: string[];
  // Action tiles, at most ENVI_KEYWORD_LIMITS.maxTiles.
  actions: EnviActionId[];
};

const NONE: EnviKeywords = { warnings: [], actions: [] };

// Does this reading reach the level where heat and poor air call for the
// combined advice?
const isHigh = (current: HazardReadings) =>
  HAZARD_KINDS.every(hazard => {
    const level = hazardLevelOf(hazard, current[hazard]);
    return level !== null && level >= ENVI_CONFIG.dualAdviceMinLevel;
  });

// The keywords on the Environmental Index card (and, as full sentences, in
// its detail sheet). Like the level itself, they never say which hazard
// set the level — chips name a risk, tiles an action.
// - No readings: nothing.
// - Level 1: one calm tile, no chip.
// - Both hazards high: both chips, and the fixed combined tiles — never the
//   two lists merged, which would put "cool down outdoors in the shade"
//   next to "keep windows closed".
// - Otherwise the higher hazard's chip and tiles; on a tie, the season's
//   hazard (leadHazard). `nowMs` only settles that tie.
export const enviKeywordsFor = (
  current: HazardReadings,
  nowMs: number = Date.now(),
): EnviKeywords => {
  const envi = getEnviLevel(current);
  if (envi === null) return NONE;
  if (envi === 1) return { warnings: [], actions: [...ENVI_CALM_ACTIONS] };

  if (isHigh(current)) {
    return {
      warnings: HAZARD_KINDS.map(
        hazard => ENVI_WARNING_COPY[hazard][levelOf(hazard, current[hazard] as number)],
      ),
      actions: ENVI_DUAL_ACTIONS.slice(0, ENVI_KEYWORD_LIMITS.maxTiles),
    };
  }

  const lead = leadHazard(current, nowMs);
  const value = current[lead];
  // The lead is always an available hazard at ENVI's level (≥ 2 here), so
  // both lookups find an entry; the guards only keep a gap in the tables
  // from crashing the card.
  if (value === null) return NONE;
  const level = levelOf(lead, value);
  const warning = ENVI_WARNING_COPY[lead][level];
  return {
    warnings: warning ? [warning] : [],
    actions: (ENVI_HAZARD_ACTIONS[lead][level] ?? []).slice(0, ENVI_KEYWORD_LIMITS.maxTiles),
  };
};
