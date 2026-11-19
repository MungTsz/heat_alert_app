// src/types/alerts.ts
import type { AqhiLevel, HeatLevel } from './settings';

// The two peer hazards every alert feature must treat the same way.
export type HazardKind = 'heat' | 'aqhi';

// "Who are you?" / "Who's usually here?" — asked instead of a numeric
// threshold, because people know who they are far better than they know
// what an index value means. Several can apply (pregnant AND asthma), so it
// is a list. Options describe people, never "risk": older adults rarely see
// themselves as high-risk, so a "vulnerable?" question gets answered "no".
// The levels each one maps to live in alertConfig.ts. Health data: kept on
// the phone only (see BookmarkEntry.alertProfile).
export type IdentityGroup =
  | 'general' // general adult — only ever on its own
  | 'older' // older adult (65+)
  | 'pregnant'
  | 'asthma'
  | 'heartLung' // heart or other lung condition
  | 'otherChronic' // other long-term condition, e.g. kidney disease, diabetes
  | 'child'; // places only: never offered for "Who are you?"

// "Where do you spend most of your day?" — the everyday pattern, asked once.
// Where someone is right now is a separate, automatic question (not built yet).
export type DailyActivity = 'indoors' | 'outdoors';

// Whoever a profile is about — the phone's owner (About you) or the people
// at a place. These three answers decide the alert level and the advice.
export type AlertPerson = {
  // Never empty: ['general'] alone, or any mix of the others (never general
  // with others). Write it through toggleIdentity / normalizeIdentities.
  identities: IdentityGroup[];
  // Asked without the medicine's name: the app never judges a medicine,
  // only lowers the heat level and suggests asking a doctor or pharmacist.
  takesRegularMedicine: boolean;
  dailyActivity: DailyActivity;
};

// Which of the push advice sentences fits: the careful one (any group that
// needs more care), the outdoor-work one, or the everyday one. Push advice
// stays at this coarse grain for now.
export type AdviceGroup = 'general' | 'sensitive' | 'outdoor';

// Set up for myself, or for a family member / someone else. A family place
// gets "call to remind them" wording — research shows older adults act on
// advice from people they know more than on push messages.
export type CaringFor = 'self' | 'family';

export type PlaceAlertProfile = AlertPerson & {
  caringFor: CaringFor;
  hazards: Record<HazardKind, boolean>;
  // Advanced: replaces the audience's default alert level for one hazard.
  // Absent = follow the audience, which is what almost everyone should use.
  levelOverride?: { heat?: HeatLevel; aqhi?: AqhiLevel };
  // Places only, and only 'self' ones: the three AlertPerson answers are the
  // owner's "About you" answers, looked up on every read, so changing About
  // you moves all of your own places with it. Absent on About you itself and
  // on places saved before it existed — read places through
  // resolvePlaceAlertProfile().
  followsAboutYou?: boolean;
  // The answers were converted from the old one-choice audience and were a
  // guess ("Older adult, child or pregnant" became Older adult), so the
  // person is asked to check them once. Cleared by saving the profile.
  // Present only when true.
  needsReview?: boolean;
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
  // Set on cancellation: the new forecast's peak, so the message can say
  // what it eased to. Optional — events stored before it existed lack it.
  cancelledPeakValue?: number | null;
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

// What a message is: one notice group, or one of the scheduled kinds —
// the morning "today" reminder, the no-alerts summary, a digest merging
// several of these, or the Settings sample.
export type AlertMessageKind = AlertMessageGroup | 'reminder' | 'summary' | 'digest' | 'sample';

// One push notification, possibly covering several places and both hazards.
export type AlertMessage = {
  id: string;
  group: AlertMessageKind;
  // Lower = more important; picks which messages survive the daily cap.
  priority: number;
  urgent: boolean;
  title: string;
  body: string;
  // Events this message delivers — marked as told only once it is shown.
  eventKeys: string[];
};

// One place × hazard as it stood when a message went out — a snapshot, so
// the detail sheet shows what the user was told even after the event moves
// on or the place is renamed. Its AlertPerson answers voice the advice.
export type AlertDetailItem = AlertPerson & {
  eventKey: string;
  placeId: string;
  placeLabel: string;
  latitude: number | null;
  longitude: number | null;
  hazard: HazardKind;
  stage: AlertEventStage;
  value: number | null;
  rank: number;
  forecast: ForecastWindow | null;
  caringFor: CaringFor;
};

// A delivered message, kept for the detail sheet that opens when the
// notification (or a card's alert badge) is tapped.
export type AlertMessageRecord = {
  id: string;
  title: string;
  body: string;
  sentAtMs: number;
  urgent: boolean;
  items: AlertDetailItem[];
};
