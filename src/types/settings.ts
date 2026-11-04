import type { PlaceAlertProfile } from './alerts';

// Matches the classification strings returned by getHeatIndexInfo exactly —
// keep these in sync if heatIndexUtils.ts classification labels ever change.
export type HeatLevel =
  | 'No Caution'
  | 'Caution'
  | 'Extreme Caution'
  | 'Danger'
  | 'Extreme Danger';

export const HEAT_LEVELS_ORDERED: HeatLevel[] = [
  'No Caution',
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

// The two scheduled digests: the evening heads-up for tomorrow, and the
// morning reminder for today.
export type DigestSlot = 'evening' | 'morning';

export type DigestSetting = {
  enabled: boolean;
  minute: number; // minutes after midnight, Hong Kong time
};

// What a day with nothing to report sends: nothing (the default — silence
// means no risk), or a short morning summary saying so.
export type NoEventDays = 'silent' | 'summary';

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
  // Heads-ups and cancellations wait for the next digest instead of
  // arriving whenever the forecast changes.
  digests: Record<DigestSlot, DigestSetting>;
  // Off = "it got worse" alerts also wait for the next digest (urgent
  // levels still come through at once).
  breakingUpdates: boolean;
  noEventDays: NoEventDays;
};
