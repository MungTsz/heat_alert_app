// src/utils/hazardLevels.ts
import { HazardKind } from '../types/alerts';
import { AQHI_LEVELS_ORDERED, HEAT_LEVELS_ORDERED } from '../types/settings';
import {
  formatHeatZoneRangeC,
  getHeatIndexInfo,
  getHeatZoneByClassification,
} from './heatIndexUtils';
import { formatAqhiLevelRange, formatAqhiValue, getAqhiInfo } from './aqhiUtils';

// One adapter over the two hazards' own level tables, so the alert engine
// treats heat and AQHI identically (ranks, comparisons, labels) while each
// hazard's classification stays defined in exactly one place
// (heatIndexUtils.ts / aqhiUtils.ts).

export const HAZARD_LEVELS: Record<HazardKind, readonly string[]> = {
  heat: HEAT_LEVELS_ORDERED,
  aqhi: AQHI_LEVELS_ORDERED,
};

export const levelOf = (hazard: HazardKind, value: number): string =>
  hazard === 'heat'
    ? getHeatIndexInfo(value).classification
    : getAqhiInfo(value).classification;

// Position in HAZARD_LEVELS (0 = mildest); -1 for an unknown level name.
export const rankOfLevel = (hazard: HazardKind, level: string): number =>
  HAZARD_LEVELS[hazard].indexOf(level);

export const rankOf = (hazard: HazardKind, value: number): number =>
  rankOfLevel(hazard, levelOf(hazard, value));

export const levelAtRank = (hazard: HazardKind, rank: number): string =>
  HAZARD_LEVELS[hazard][Math.max(0, Math.min(rank, HAZARD_LEVELS[hazard].length - 1))];

// The number as the rest of the app shows it: "7", "10+", "41°C".
export const formatHazardValue = (hazard: HazardKind, value: number): string =>
  hazard === 'heat' ? `${Math.round(value)}°C` : formatAqhiValue(value);

// The span a level covers: "8-10" for AQHI Very High, "32-39°C" for heat
// Extreme Caution — for labelling level choices without a sample value.
export const formatLevelRange = (hazard: HazardKind, level: string): string =>
  hazard === 'heat'
    ? formatHeatZoneRangeC(getHeatZoneByClassification(level))
    : formatAqhiLevelRange(level);

// "High (7)", "Very High (8-10)", "Extreme Caution (32-39°C)" — a level name
// always travels with its numbers, so users learn what the numbers mean.
export const formatLevelWithRange = (hazard: HazardKind, level: string): string =>
  `${level} (${formatLevelRange(hazard, level)})`;
