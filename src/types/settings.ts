import type { PlaceAlertProfile } from './alerts';

// Matches the classification strings returned by getHeatIndexInfo exactly —
// keep these in sync if heatIndexUtils.ts classification labels ever change.
export type HeatLevel =
  | 'Safe'
  | 'Caution'
  | 'Extreme Caution'
  | 'Danger'
  | 'Extreme Danger';

export const HEAT_LEVELS_ORDERED: HeatLevel[] = [
  'Safe',
  'Caution',
  'Extreme Caution',
  'Danger',
  'Extreme Danger',
];

// Matches the classification strings returned by getAqhiInfo exactly.
export type AqhiLevel = 'Low' | 'Moderate' | 'High' | 'Very High' | 'Serious';

export const AQHI_LEVELS_ORDERED: AqhiLevel[] = [
  'Low',
  'Moderate',
  'High',
  'Very High',
  'Serious',
];

// When an all-clear is sent. "auto" = only for places set up for family:
// a carer needs to know when to tell them it's fine to go out again, while
// someone watching their own place doesn't need the extra message.
export type AllClearMode = 'auto' | 'always' | 'off';

// Minutes after midnight, Hong Kong time. start > end wraps past midnight
// (the default 23:00–07:00).
export type QuietHours = {
  enabled: boolean;
  startMinute: number;
  endMinute: number;
};

// Global settings decide HOW alerts arrive; each place's PlaceAlertProfile
// decides WHEN it counts as dangerous. Kept apart so no screen mixes the two
// kinds of question. Defaults live in alertConfig.ts.
export type NotificationSettings = {
  // "About you" — the profile for the phone's live location. caringFor is
  // always 'self' here.
  currentLocationProfile: PlaceAlertProfile;
  notifyCurrentLocation: boolean;
  notifyBookmarkedLocations: boolean;
  allClear: AllClearMode;
  quietHours: QuietHours;
};
