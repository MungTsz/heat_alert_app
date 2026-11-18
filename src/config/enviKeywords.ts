// src/config/enviKeywords.ts
import { HazardKind } from '../types/alerts';
import { EnviActionId } from '../types/envi';

// The Environmental Index card's keywords: which action tiles go with each
// hazard level. The words are in alertCopy.ts (ENVI_ACTION_COPY,
// ENVI_WARNING_COPY) with the rest of the UI copy, and the icons in
// enviKeywordIcons.ts. Health advice: needs a public-health review before
// release.

// Action tiles per hazard, keyed by each hazard's own level name (the names
// in heatIndexUtils.ts / aqhiUtils.ts). The lowest level has no entry: at
// Environmental Index 1 the card shows ENVI_CALM_ACTIONS instead.
export const ENVI_HAZARD_ACTIONS: Record<HazardKind, Record<string, readonly EnviActionId[]>> = {
  heat: {
    Caution: ['drinkWater', 'restInShade'],
    'Extreme Caution': ['drinkWater', 'restInShade', 'avoidMidday'],
    Danger: ['avoidMidday', 'stayCool', 'drinkWater'],
    'Extreme Danger': ['stayIndoors', 'stayCool', 'drinkWater'],
  },
  aqhi: {
    Moderate: ['watchSymptoms'],
    High: ['lessExertion', 'avoidBusyRoads'],
    'Very High': ['lessExertion', 'avoidBusyRoads', 'lessTimeOutside'],
    Serious: ['stayIndoors', 'avoidExertion'],
  },
};

// Heat and poor air together (both at ENVI_CONFIG.dualAdviceMinLevel or
// above). A fixed set rather than the two lists merged: heat advice says
// open up and cool down, air advice says shut out the air, and merging them
// would show both. Same reasoning as DUAL_ADVICE in alertCopy.ts.
export const ENVI_DUAL_ACTIONS: readonly EnviActionId[] = ['stayIndoors', 'airConOn', 'windowsClosed'];

// Environmental Index 1: one tile, nothing to warn about.
export const ENVI_CALM_ACTIONS: readonly EnviActionId[] = ['enjoyOutdoors'];

export const ENVI_KEYWORD_LIMITS = {
  // Tiles in one row on the card.
  maxTiles: 3,
  // Words under a tile icon — tests hold every label to this. 3, not 2:
  // "Rest in shade", "Avoid busy roads" and "Less time outside" need it,
  // and the tile wraps to a second line.
  maxTileWords: 3,
};
