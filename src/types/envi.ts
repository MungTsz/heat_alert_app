// src/types/envi.ts

// One "what to do" keyword on the Environmental Index card (an action tile)
// and in its detail sheet (as a full sentence). Each id has exactly one
// icon (config/enviKeywords.ts) and one label + sentence
// (config/alertCopy.ts → ENVI_ACTION_COPY), so a tile and its sentence can
// never drift apart.
export type EnviActionId =
  | 'drinkWater'
  | 'restInShade'
  | 'avoidMidday'
  | 'stayCool'
  | 'airConOn'
  | 'stayIndoors'
  | 'lessExertion'
  | 'avoidExertion'
  | 'avoidBusyRoads'
  | 'lessTimeOutside'
  | 'watchSymptoms'
  | 'windowsClosed'
  | 'enjoyOutdoors';
