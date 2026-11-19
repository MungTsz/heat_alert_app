// src/config/enviKeywords.ts
import { HazardKind, IdentityGroup } from '../types/alerts';
import { EnviActionId, LocationContext } from '../types/envi';

// The Environmental Index card's keywords: which action tiles go with each
// hazard level, where the owner is, and who they are. The words are in
// alertCopy.ts (ENVI_ACTION_COPY, ENVI_WARNING_COPY) with the rest of the UI
// copy, and the icons in enviKeywordIcons.ts. How the tables combine is in
// utils/enviKeywords.ts. Health advice: every entry needs a public-health
// review before release (asthma ideally by someone who knows respiratory
// disease).

type ContextActions = Record<LocationContext, readonly EnviActionId[]>;

// One set for every context, where the advice doesn't depend on it.
const everywhere = (actions: readonly EnviActionId[]): ContextActions => ({
  indoors: actions,
  outdoors: actions,
  transit: actions,
  unknown: actions,
});

// Action tiles per hazard, keyed by each hazard's own level name (the names
// in heatIndexUtils.ts / aqhiUtils.ts), then by where the owner is. The
// lowest level has no entry: at Environmental Index 1 the card shows
// ENVI_CALM_ACTIONS instead. Advice fits the place — never "use air-con" to
// someone in the street — and 'unknown' holds the general advice, right
// wherever the person turns out to be. Heat from Danger up says air-con, not
// a fan: in extreme heat a fan alone may not cool a body down.
export const ENVI_HAZARD_ACTIONS: Record<HazardKind, Record<string, ContextActions>> = {
  heat: {
    Caution: {
      indoors: ['drinkWater', 'keepRoomsCool'],
      outdoors: ['drinkWater', 'restInShade'],
      transit: ['carryWater', 'waitInShade'],
      unknown: ['drinkWater', 'restInShade'],
    },
    'Extreme Caution': {
      indoors: ['keepRoomsCool', 'drinkWater', 'avoidMiddayOutings'],
      outdoors: ['restInShade', 'drinkWater', 'slowDown'],
      transit: ['carryWater', 'waitIndoors', 'restIfUnwell'],
      unknown: ['drinkWater', 'restInShade', 'avoidMidday'],
    },
    Danger: {
      indoors: ['airConOn', 'drinkWater', 'avoidMiddayOutings'],
      outdoors: ['moveToShade', 'drinkWater', 'slowDown'],
      transit: ['carryWater', 'waitIndoors', 'restIfUnwell'],
      unknown: ['avoidMidday', 'stayCool', 'drinkWater'],
    },
    'Extreme Danger': {
      indoors: ['stayIndoors', 'airConOn', 'drinkWater'],
      outdoors: ['goIndoorsNow', 'drinkWater', 'stopActivity'],
      transit: ['headIndoors', 'carryWater', 'restIfUnwell'],
      unknown: ['stayIndoors', 'stayCool', 'drinkWater'],
    },
  },
  aqhi: {
    Moderate: everywhere(['watchSymptoms']),
    High: {
      indoors: ['fewerOutings', 'exerciseIndoors'],
      outdoors: ['lessExertion', 'avoidBusyRoads'],
      transit: ['windowsUp', 'avoidRoadsideWaits'],
      unknown: ['lessExertion', 'avoidBusyRoads'],
    },
    'Very High': {
      indoors: ['windowsClosed', 'exerciseIndoors', 'fewerOutings'],
      outdoors: ['lessExertion', 'avoidBusyRoads', 'headIndoorsSooner'],
      transit: ['windowsUp', 'avoidRoadsideWaits'],
      unknown: ['lessExertion', 'avoidBusyRoads', 'lessTimeOutside'],
    },
    Serious: {
      indoors: ['stayIndoors', 'windowsClosed', 'avoidExertion'],
      outdoors: ['goIndoorsNow', 'avoidExertion'],
      transit: ['windowsUp', 'headIndoors'],
      unknown: ['stayIndoors', 'avoidExertion'],
    },
  },
};

// Heat and poor air together (both at ENVI_CONFIG.dualAdviceMinLevel or
// above). A fixed set per context rather than the two lists merged: heat
// advice says find shade and air, air advice says shut the air out, and
// merging them would show both. Same reasoning as DUAL_ADVICE in
// alertCopy.ts.
export const ENVI_DUAL_ACTIONS: ContextActions = {
  indoors: ['airConOn', 'windowsClosed', 'drinkWater'],
  outdoors: ['goIndoors', 'drinkWater', 'avoidBusyRoads'],
  transit: ['airConWindowsUp', 'carryWater', 'headIndoors'],
  unknown: ['stayIndoors', 'airConOn', 'windowsClosed'],
};

// Environmental Index 1: one tile, nothing to warn about, for everyone.
export const ENVI_CALM_ACTIONS: readonly EnviActionId[] = ['enjoyOutdoors'];

// Who a person tip is for: one of the About you identities, or anyone who
// takes regular medicine.
export type EnviTipAudience = IdentityGroup | 'medicine';

export type EnviPersonTip = {
  audience: EnviTipAudience;
  action: EnviActionId;
  // Shown once ANY listed hazard is at this level (1-5) or above.
  minLevel: Partial<Record<HazardKind, number>>;
  // A general tile this one says more precisely for these people — it
  // takes that tile's place instead of the last one.
  refines?: EnviActionId;
};

// Tips for particular people, in priority order: the card shows only the
// first that applies (in place of the general set's last tile), the
// recommendations sheet lists them all. The same order picks which
// identity the "For you" line names. Children (family places only) get the
// same tip at the same level as older adults.
export const ENVI_PERSON_TIPS: readonly EnviPersonTip[] = [
  { audience: 'asthma', action: 'carryInhaler', minLevel: { heat: 3, aqhi: 3 } },
  { audience: 'heartLung', action: 'followCarePlan', minLevel: { heat: 3, aqhi: 3 } },
  { audience: 'pregnant', action: 'restOften', minLevel: { heat: 2 } },
  { audience: 'older', action: 'drinkBeforeThirsty', minLevel: { heat: 2 }, refines: 'drinkWater' },
  { audience: 'child', action: 'drinkBeforeThirsty', minLevel: { heat: 2 }, refines: 'drinkWater' },
  { audience: 'otherChronic', action: 'followCarePlan', minLevel: { heat: 3 } },
  { audience: 'medicine', action: 'keepMedicineCool', minLevel: { heat: 3 } },
];

// The sheet's "ask your doctor or pharmacist" line for people on regular
// medicine, from this heat level up. The app never judges a medicine, and
// never suggests stopping or changing one.
export const ENVI_MEDICINE_NOTE_MIN_HEAT_LEVEL = 2;

// Someone more at risk (any identity other than General adult, or regular
// medicine) who is outdoors once the index reaches minLevel: the first tile
// becomes "Go indoors soon".
export const ENVI_ESCALATION = {
  minLevel: 4,
  action: 'goIndoorsSoon' as EnviActionId,
  // Sets that already say it as strongly or more are left alone ("now"
  // must never be softened to "soon").
  alreadyCovered: ['goIndoors', 'goIndoorsNow'] as readonly EnviActionId[],
  // Weaker wording of the same thing, dropped so it isn't said twice.
  supersedes: ['headIndoorsSooner'] as readonly EnviActionId[],
};

export const ENVI_KEYWORD_LIMITS = {
  // Tiles in one row on the card.
  maxTiles: 3,
  // Words under a tile icon — tests hold every label to this. 3, not 2:
  // "Rest in shade", "Avoid busy roads" and "Less time outside" need it,
  // and the tile wraps to a second line.
  maxTileWords: 3,
};
