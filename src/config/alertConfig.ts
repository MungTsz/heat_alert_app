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
  // The morning "today" reminder ranks with heads-ups: both are planned,
  // scheduled information rather than news.
  reminder: 3,
  preview: 3,
  cancelled: 4,
  cleared: 5,
  summary: 6,
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

// Quiet-hours and digest time pickers step by this much.
export const QUIET_HOURS_STEP_MINUTES = 30;

// Scheduled digests (Hong Kong time). The evening slot sits after PRAISE's
// afternoon forecast update so tomorrow's outlook is fresh, early enough to
// change tomorrow's plans; the morning slot comes before people head out.
// Ranges bound the Settings time pickers.
export const DIGEST_CONFIG = {
  evening: { defaultMinute: 19 * 60 + 30, minMinute: 18 * 60, maxMinute: 21 * 60 },
  morning: { defaultMinute: 7 * 60 + 30, minMinute: 6 * 60 + 30, maxMinute: 8 * 60 + 30 },
  // A digest the phone missed (asleep, no background run) is still sent
  // this long after its time — a 7:30 reminder at 10:00 still helps, a
  // 19:30 heads-up at 1 am does not.
  lateWindowMs: 2 * HOUR_MS,
};

export const BACKGROUND_ALERT_CONFIG = {
  // Periodic background check. The OS treats this as a minimum and may run
  // it later (Doze on Android, iOS's own scheduling).
  minimumFetchIntervalMinutes: 15,
  // One-shot task timed for the next digest, so it isn't left to the
  // periodic check's jitter. iOS only runs task ids registered under
  // BGTaskSchedulerPermittedIdentifiers in Info.plist, with this prefix.
  digestTaskId: 'com.transistorsoft.alertdigest',
  // Background runs can't ask for a GPS fix; they use the last position
  // the app saw, if it is this recent. Older than this, the current
  // location is skipped rather than alerting for somewhere the user left.
  lastLocationMaxAgeMs: 12 * HOUR_MS,
};

// Delivered messages kept for the alert detail sheet and card badges.
export const ALERT_MESSAGE_LOG_CONFIG = {
  maxEntries: 30,
  retentionMs: 72 * HOUR_MS,
};

// How often Home / Community re-read active alerts while open (they also
// refresh whenever a check finishes).
export const ACTIVE_ALERTS_REFRESH_MS = MINUTE_MS;

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  currentLocationProfile: DEFAULT_PLACE_ALERT_PROFILE,
  notifyCurrentLocation: true,
  notifyBookmarkedLocations: true,
  allClear: 'auto',
  quietHours: { enabled: true, startMinute: 23 * 60, endMinute: 7 * 60 },
  digests: {
    evening: { enabled: true, minute: DIGEST_CONFIG.evening.defaultMinute },
    morning: { enabled: true, minute: DIGEST_CONFIG.morning.defaultMinute },
  },
  breakingUpdates: true,
  noEventDays: 'silent',
};
