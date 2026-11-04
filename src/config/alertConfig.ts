// src/config/alertConfig.ts
import {
  AudienceGroup,
  HazardKind,
  PlaceAlertProfile,
} from '../types/alerts';
import {
  AqhiLevel,
  HeatLevel,
  NotificationSettings,
} from '../types/settings';

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

// How often the engine re-checks while the app is open.
export const ALERT_CHECK_INTERVAL_MS = 5 * MINUTE_MS;

// Order the audience options appear in — the most common answer first.
export const AUDIENCE_GROUPS: readonly AudienceGroup[] = [
  'general',
  'sensitive',
  'chronic',
  'outdoor',
];

// The level at which each audience starts getting alerts.
// AQHI follows EPD's health advice: "High" is where children, older adults
// and people with heart or lung disease are advised to cut outdoor
// exertion; "Very High" is where the general public and outdoor workers are.
// EPD's advice doesn't name pregnancy — grouping it with "High" is the
// conservative choice, taken from HKO's hot-weather advice.
// Heat uses the app's NWS heat index levels (the Spatial Temperature API's
// scale), NOT HKO warnings or the Labour Department's Hong Kong Heat Index
// bands — those are a different scale from a different source. Extreme
// Caution is where NWS warns of heat illness "with prolonged exposure and/or
// physical activity", which is what sensitive groups and outdoor workers face.
// These heat defaults are this app's proposal and still need a public-health
// review before release.
export const AUDIENCE_ALERT_LEVELS: Record<
  AudienceGroup,
  { heat: HeatLevel; aqhi: AqhiLevel }
> = {
  general: { heat: 'Danger', aqhi: 'Very High' },
  sensitive: { heat: 'Extreme Caution', aqhi: 'High' },
  chronic: { heat: 'Extreme Caution', aqhi: 'High' },
  outdoor: { heat: 'Extreme Caution', aqhi: 'Very High' },
};

// Levels offered under Advanced. Levels below these are too mild to warrant
// a push (the old engine also never alerted below Extreme Caution).
export const ADVANCED_LEVEL_CHOICES: {
  heat: readonly HeatLevel[];
  aqhi: readonly AqhiLevel[];
} = {
  heat: ['Extreme Caution', 'Danger', 'Extreme Danger'],
  aqhi: ['High', 'Very High', 'Serious'],
};

// At these levels a live alert is urgent: it ignores quiet hours, the
// batching wait, the per-event cooldown and the daily cap. AQHI "Serious"
// is EPD's top band; Extreme Danger is its heat peer.
export const URGENT_LEVELS: { heat: HeatLevel; aqhi: AqhiLevel } = {
  heat: 'Extreme Danger',
  aqhi: 'Serious',
};

// Event life-cycle timing. Initial values from the design doc — to be tuned
// by replaying two years of hourly history.
export const ALERT_EVENT_CONFIG = {
  // Readings must stay below the level this long before an all clear, so a
  // reading wobbling between 7 and 8 doesn't clear and re-trigger hourly.
  clearAfterMs: 3 * HOUR_MS,
  // A return above the level within this long of clearing continues the
  // same event instead of starting (and re-announcing) a new one.
  mergeWindowMs: 6 * HOUR_MS,
  // How far ahead a forecast breach opens a heads-up.
  previewHorizonMs: 36 * HOUR_MS,
  // An event doesn't clear while the forecast still breaches this soon.
  clearForecastLookaheadMs: 6 * HOUR_MS,
  // A heads-up whose start moves this much earlier is re-sent as an update.
  earlierStartUpdateMs: 2 * HOUR_MS,
  // Data hours are hourly — a forecast point covers the hour it starts.
  forecastStepMs: HOUR_MS,
};

export const ALERT_DELIVERY_CONFIG = {
  // Non-urgent messages per day (Hong Kong calendar day). Over the cap,
  // notices stay queued and are re-checked later rather than dropped.
  dailyCap: 3,
  // A new notice waits this long so other places / the other hazard can
  // join it in one message.
  batchWindowMs: 10 * MINUTE_MS,
  // Minimum gap between two live messages about the same event.
  immediateCooldownMs: 3 * HOUR_MS,
  // Places named in a push before "and N more places".
  maxPlacesInMessage: 3,
  // Delivery log retention — only today's entries count towards the cap.
  logRetentionMs: 48 * HOUR_MS,
};

// Lower = more important. Urgent beats everything; then the design doc's
// order: escalation, breaking, heads-up, cancellation, all clear.
export const ALERT_MESSAGE_PRIORITY = {
  urgent: 0,
  escalation: 1,
  breaking: 2,
  preview: 3,
  cancelled: 4,
  cleared: 5,
};

// Event id for the phone's live location (bookmarks use their own ids).
export const CURRENT_LOCATION_PLACE_ID = 'current';

export const HAZARD_KINDS: readonly HazardKind[] = ['heat', 'aqhi'];

export const DEFAULT_PLACE_ALERT_PROFILE: PlaceAlertProfile = {
  audience: 'general',
  caringFor: 'self',
  hazards: { heat: true, aqhi: true },
};

// "Preview a notification" shows a heads-up starting at this HK hour
// tomorrow — a typical afternoon pollution/heat peak.
export const SAMPLE_PREVIEW_HK_HOUR = 14;

// Quiet-hours time pickers step by this much.
export const QUIET_HOURS_STEP_MINUTES = 30;

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  currentLocationProfile: DEFAULT_PLACE_ALERT_PROFILE,
  notifyCurrentLocation: true,
  notifyBookmarkedLocations: true,
  allClear: 'auto',
  quietHours: { enabled: true, startMinute: 23 * 60, endMinute: 7 * 60 },
};
