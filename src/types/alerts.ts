// src/types/alerts.ts
import type { AqhiLevel, HeatLevel } from './settings';

// The two peer hazards every alert feature must treat the same way.
export type HazardKind = 'heat' | 'aqhi';

// "Who is mainly here?" — asked per place instead of a numeric threshold,
// because people know who lives or works somewhere far better than they
// know what an index value means. Options describe people, never "risk":
// older adults rarely see themselves as high-risk, so a "vulnerable?"
// question gets answered "no". The levels each group maps to live in
// alertConfig.ts. Kept on the phone only (see BookmarkEntry.alertProfile).
export type AudienceGroup =
  | 'general' // general adult
  | 'sensitive' // older adult, child or pregnant
  | 'chronic' // heart, lung or other long-term condition
  | 'outdoor'; // outdoor work or exercise

// Set up for myself, or for a family member / someone else. A family place
// gets "call to remind them" wording — research shows older adults act on
// advice from people they know more than on push messages.
export type CaringFor = 'self' | 'family';

export type PlaceAlertProfile = {
  audience: AudienceGroup;
  caringFor: CaringFor;
  hazards: Record<HazardKind, boolean>;
  // Advanced: replaces the audience's default alert level for one hazard.
  // Absent = follow the audience, which is what almost everyone should use.
  levelOverride?: { heat?: HeatLevel; aqhi?: AqhiLevel };
};

// Where an event is in its life:
// - forecast:  the forecast reaches the alert level; nothing measured yet
// - active:    the latest reading is at or above the alert level
// - easing:    the reading dropped below, but not for long enough to clear
// - cleared:   below for long enough; kept briefly so a quick return counts
//              as the same event rather than a brand-new one
// - cancelled: a forecast the user was told about no longer reaches the
//              level; kept only until the cancellation is delivered
export type AlertEventStage =
  | 'forecast'
  | 'active'
  | 'easing'
  | 'cleared'
  | 'cancelled';

// What the user is owed a message about.
export type AlertNoticeKind =
  | 'preview' // heads-up from the forecast
  | 'breaking' // reached the level with no heads-up
  | 'escalation' // worse (or earlier) than what the user was already told
  | 'cancelled' // the heads-up no longer applies
  | 'cleared'; // all clear

// The first upcoming run of forecast hours at or above the alert level.
export type ForecastWindow = {
  startMs: number;
  endMs: number; // end of the last breaching hour
  minValue: number;
  maxValue: number;
  peakRank: number;
};

export type PendingNotice = {
  kind: AlertNoticeKind;
  // The level rank the notice is about — becomes toldRank once delivered.
  rank: number;
  // Kept from the first queued notice when a later one replaces it, so a
  // notice that keeps getting upgraded doesn't keep restarting its wait.
  queuedAtMs: number;
  // Bypasses quiet hours, the batching wait, the cooldown and the daily cap.
  urgent: boolean;
};

// One hazard at one place, from first sign to all clear. The unit of
// notification: however many hourly readings an episode spans, the user
// hears about it a handful of times.
export type AlertEvent = {
  key: string; // `${placeId}|${hazard}` — see alertEventKey()
  placeId: string;
  hazard: HazardKind;
  stage: AlertEventStage;
  openedAtMs: number;
  latestValue: number | null;
  forecast: ForecastWindow | null;
  // Highest level rank the user has actually been told about (-1 = never
  // told). Escalations compare against this, not against the last reading,
  // so a reading that bobs around one level never re-notifies.
  toldRank: number;
  // Start time of the heads-up the user was last told — a forecast drifting
  // earlier an hour per tick still counts as "moved earlier" against this.
  toldStartMs: number | null;
  belowSinceMs: number | null;
  clearedAtMs: number | null;
  allClearSent: boolean;
  // Last delivered breaking/escalation — drives the per-event cooldown.
  lastImmediateAtMs: number | null;
  pending: PendingNotice | null;
};

// Notices that merge into one message. Breaking and escalation share
// "live" because both say "it's bad now"; a forecast-stage escalation is a
// heads-up update, so it joins the previews.
export type AlertMessageGroup = 'live' | 'preview' | 'cancelled' | 'cleared';

// One push notification, possibly covering several places and both hazards.
export type AlertMessage = {
  id: string;
  group: AlertMessageGroup;
  // Lower = more important; picks which messages survive the daily cap.
  priority: number;
  urgent: boolean;
  title: string;
  body: string;
  // Events this message delivers — marked as told only once it is shown.
  eventKeys: string[];
};
