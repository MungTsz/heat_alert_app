// src/utils/locationContext.ts
import { LOCATION_CONTEXT_CONFIG } from '../config/exposureTrackingConfig';
import { DailyActivity } from '../types/alerts';
import {
  KnownLocationContext,
  LocationContext,
  LocationContextSource,
} from '../types/envi';
import { haversineMeters } from './geoClustering';
import { toHkDateKey } from './hkDate';

// Where the owner is right now — indoors / outdoors / on the move / unknown —
// judged on the phone from recent tracked positions. Pure, so every rule is
// tested; when the backend can one day say indoors / outdoors sooner, only
// judgeLocationContext changes, never the screens or the advice.

export type Coordinates = { latitude: number; longitude: number };

// One tracked position. accuracyMeters is null when the phone didn't say.
export type LocationFix = Coordinates & { timeMs: number; accuracyMeters: number | null };

// A saved place: every saved place is an indoor one (Home, Office, School,
// Other Indoor — PlaceCategory has no outdoor kind).
export type ContextPlace = Coordinates & { radiusMeters: number };

// "I'm indoors" from the correction sheet, for this stay only: it lapses
// when the phone leaves where it was made, or at HK midnight.
export type LocationContextOverride = {
  context: KnownLocationContext;
  // HK day (YYYY-MM-DD) it was made on.
  dayKey: string;
  // Where the phone was; null when nothing knew (then it lasts the day).
  position: Coordinates | null;
};

export type ResolvedLocationContext = {
  context: LocationContext;
  source: LocationContextSource;
};

type Config = typeof LOCATION_CONTEXT_CONFIG;

const MINUTE_MS = 60 * 1000;

// How far back the judgement looks: the outdoor run plus one allowed gap
// before it (the fix that shows where the run started).
export const LOCATION_CONTEXT_LOOKBACK_MS =
  (LOCATION_CONTEXT_CONFIG.outdoorMinMinutes + LOCATION_CONTEXT_CONFIG.maxGapMinutes) * MINUTE_MS;

const distance = (a: Coordinates, b: Coordinates): number =>
  haversineMeters(a.latitude, a.longitude, b.latitude, b.longitude);

const isUsable = (fix: LocationFix, config: Config): boolean =>
  fix.accuracyMeters === null || fix.accuracyMeters <= config.maxAccuracyMeters;

const isInsidePlace = (fix: Coordinates, places: readonly ContextPlace[], config: Config) =>
  places.some(place => distance(fix, place) <= place.radiusMeters + config.placeDriftMarginMeters);

// The speed at fixes[i] (m/s): net displacement from the first fix of the
// trailing window, less GPS jitter, over at least the minimum span. Ping-to-
// ping speeds are useless — a still phone indoors jumps 10-20 m per ping.
const netSpeedAt = (fixes: readonly LocationFix[], i: number, config: Config): number => {
  const end = fixes[i];
  const windowStart = end.timeMs - config.speedWindowSeconds * 1000;
  let first = i;
  while (first > 0 && fixes[first - 1].timeMs >= windowStart) first--;
  const start = fixes[first];
  const moved = Math.max(0, distance(start, end) - config.gpsNoiseMeters);
  const spanSeconds = Math.max((end.timeMs - start.timeMs) / 1000, config.speedMinSpanSeconds);
  return moved / spanSeconds;
};

// The judgement from tracked positions alone. Every doubt is 'unknown', so
// the advice falls back to the general version rather than a wrong one:
// - no position, the newest too old, or every fix too blurry → unknown;
// - vehicle speed in the last few minutes → transit (a bus at a stop is
//   still on the move);
// - the newest position inside a saved place (with indoor GPS drift) →
//   indoors;
// - outdoors only when the whole last outdoorMinMinutes is accounted for:
//   outside every saved place, no hole in the track (MTR, deep indoors), no
//   vehicle, and walking at some point. A phone that has sat still outside
//   every saved place is as likely in a café or someone's flat as on a
//   bench — and the exposure backend calls a long still stay indoors — so
//   that stays unknown. Just left a place, or tracking only just started →
//   unknown too.
export const judgeLocationContext = (
  fixes: readonly LocationFix[],
  places: readonly ContextPlace[],
  nowMs: number,
  config: Config = LOCATION_CONTEXT_CONFIG,
): LocationContext => {
  const usable = fixes.filter(fix => isUsable(fix, config)).sort((a, b) => a.timeMs - b.timeMs);
  const latest = usable[usable.length - 1];
  if (!latest || nowMs - latest.timeMs > config.maxFixAgeMinutes * MINUTE_MS) return 'unknown';

  const speeds = usable.map((_, i) => netSpeedAt(usable, i, config));
  const holdStart = latest.timeMs - config.transitHoldMinutes * MINUTE_MS;
  if (usable.some((fix, i) => fix.timeMs >= holdStart && speeds[i] > config.transitMinSpeedMps)) {
    return 'transit';
  }

  if (isInsidePlace(latest, places, config)) return 'indoors';

  // The fix showing where the outdoor run would have started.
  const runStart = nowMs - config.outdoorMinMinutes * MINUTE_MS;
  let anchor = -1;
  for (let i = usable.length - 1; i >= 0; i--) {
    if (usable[i].timeMs <= runStart) {
      anchor = i;
      break;
    }
  }
  if (anchor < 0) return 'unknown';

  let walked = false;
  for (let i = anchor; i < usable.length; i++) {
    if (isInsidePlace(usable[i], places, config)) return 'unknown';
    if (i > anchor && usable[i].timeMs - usable[i - 1].timeMs > config.maxGapMinutes * MINUTE_MS) {
      return 'unknown';
    }
    if (speeds[i] > config.transitMinSpeedMps) return 'unknown';
    if (speeds[i] > config.stillMaxSpeedMps) walked = true;
  }
  return walked ? 'outdoors' : 'unknown';
};

// Where the phone is now, as best known: the newest usable tracked fix
// while fresh, else the fallback (Home's own GPS fix).
export const currentPositionOf = (
  fixes: readonly LocationFix[],
  fallback: Coordinates | null,
  nowMs: number,
  config: Config = LOCATION_CONTEXT_CONFIG,
): Coordinates | null => {
  const latest = fixes
    .filter(fix => isUsable(fix, config))
    .reduce<LocationFix | null>((best, fix) => (!best || fix.timeMs > best.timeMs ? fix : best), null);
  if (latest && nowMs - latest.timeMs <= config.maxFixAgeMinutes * MINUTE_MS) {
    return { latitude: latest.latitude, longitude: latest.longitude };
  }
  return fallback;
};

export const makeOverride = (
  context: KnownLocationContext,
  position: Coordinates | null,
  nowMs: number,
): LocationContextOverride => ({
  context,
  dayKey: toHkDateKey(new Date(nowMs)),
  position,
});

// Still this stay? Same HK day, and not moved away from where it was made.
// Without a position on either side there is no telling whether the phone
// left, so it holds until midnight.
export const isOverrideActive = (
  override: LocationContextOverride,
  position: Coordinates | null,
  nowMs: number,
  config: Config = LOCATION_CONTEXT_CONFIG,
): boolean => {
  if (override.dayKey !== toHkDateKey(new Date(nowMs))) return false;
  if (!override.position || !position) return true;
  return distance(override.position, position) <= config.overrideRadiusMeters;
};

export type LocationContextInput = {
  trackingOn: boolean;
  fixes: readonly LocationFix[];
  places: readonly ContextPlace[];
  dailyActivity: DailyActivity;
  override: LocationContextOverride | null;
  position: Coordinates | null;
  nowMs: number;
};

// The context the advice uses, in order:
// 1. the user's correction for this stay;
// 2. tracking off: "Often outdoors" in About you means outdoors, anyone
//    else unknown — the app never asks;
// 3. otherwise the judgement from tracked positions.
export const resolveLocationContext = (
  input: LocationContextInput,
  config: Config = LOCATION_CONTEXT_CONFIG,
): ResolvedLocationContext => {
  if (input.override && isOverrideActive(input.override, input.position, input.nowMs, config)) {
    return { context: input.override.context, source: 'override' };
  }
  if (!input.trackingOn) {
    return input.dailyActivity === 'outdoors'
      ? { context: 'outdoors', source: 'dailyActivity' }
      : { context: 'unknown', source: 'none' };
  }
  const context = judgeLocationContext(input.fixes, input.places, input.nowMs, config);
  return { context, source: context === 'unknown' ? 'none' : 'tracking' };
};
