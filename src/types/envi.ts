// src/types/envi.ts

// One "what to do" keyword on the Environmental Index card (an action tile)
// and in its detail sheet (as a full sentence). Each id has exactly one
// icon (config/enviKeywordIcons.ts) and one label + sentence
// (config/alertCopy.ts → ENVI_ACTION_COPY), so a tile and its sentence can
// never drift apart.
export type EnviActionId =
  // Heat
  | 'drinkWater'
  | 'carryWater'
  | 'restInShade'
  | 'waitInShade'
  | 'moveToShade'
  | 'avoidMidday'
  | 'avoidMiddayOutings'
  | 'stayCool'
  | 'keepRoomsCool'
  | 'airConOn'
  | 'slowDown'
  | 'stopActivity'
  | 'restIfUnwell'
  // Being indoors (both hazards)
  | 'stayIndoors'
  | 'waitIndoors'
  | 'goIndoors'
  | 'goIndoorsNow'
  | 'goIndoorsSoon'
  | 'headIndoors'
  | 'headIndoorsSooner'
  // Air quality
  | 'lessExertion'
  | 'avoidExertion'
  | 'exerciseIndoors'
  | 'avoidBusyRoads'
  | 'avoidRoadsideWaits'
  | 'lessTimeOutside'
  | 'fewerOutings'
  | 'watchSymptoms'
  | 'windowsClosed'
  | 'windowsUp'
  // Heat and poor air together, in a vehicle
  | 'airConWindowsUp'
  // For particular people (config/enviKeywords.ts → ENVI_PERSON_TIPS)
  | 'carryInhaler'
  | 'followCarePlan'
  | 'restOften'
  | 'drinkBeforeThirsty'
  | 'keepMedicineCool'
  // Environmental Index 1
  | 'enjoyOutdoors';

// Where the phone's owner is right now, judged on the phone from tracking
// (utils/locationContext.ts) or corrected with one tap for this stay.
// 'unknown' whenever the app can't tell — the advice is then the general
// one, never a guess. Family places are always 'unknown': the app never
// tracks other people.
export type LocationContext = 'indoors' | 'outdoors' | 'transit' | 'unknown';

// A context the user can pick in the correction sheet.
export type KnownLocationContext = Exclude<LocationContext, 'unknown'>;

// Where a context came from — the "For you" line words a guess from the
// daily answer differently from what tracking saw.
// - tracking: judged from recent tracked positions;
// - override: the user picked it for this stay;
// - dailyActivity: tracking is off and About you says "Often outdoors";
// - none: nothing to go on (always with 'unknown').
export type LocationContextSource = 'tracking' | 'override' | 'dailyActivity' | 'none';
