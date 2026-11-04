// src/utils/alertEvents.ts
import {
  AlertEvent,
  AlertMessageGroup,
  AlertNoticeKind,
} from '../types/alerts';
import { ALERT_EVENT_CONFIG, ALERT_MESSAGE_PRIORITY } from '../config/alertConfig';
import { HazardSignal } from './alertSignals';

// The event state machine: given what the user was last told about one
// hazard at one place and what the data says now, decide the event's next
// stage and whether the user is owed a message. Pure — no clocks, storage
// or I/O — so every rule below is pinned down by unit tests.
//
// Design doc rules this encodes:
// - one event, one thread: new messages only when it's worse than what the
//   user was told, the heads-up moved notably earlier, or it's over
// - a forecast that comes true is silent — the heads-up already covered it
// - a heads-up that no longer applies is always cancelled out loud, or the
//   user only remembers "it was wrong again"
// - all clear only after a sustained drop, and a quick return within the
//   merge window continues the same event

const isAbove = (s: HazardSignal) => s.currentRank !== null && s.currentRank >= s.thresholdRank;
const isBelow = (s: HazardSignal) => s.currentRank !== null && s.currentRank < s.thresholdRank;

// What the user knows or is about to be told — so a notice already queued
// isn't queued again on the next tick.
const knownRank = (ev: AlertEvent) => Math.max(ev.toldRank, ev.pending?.rank ?? -1);

const noticePriority = (kind: AlertNoticeKind) => ALERT_MESSAGE_PRIORITY[kind];

// Queues a notice, merging with one already waiting: the more important kind
// wins, but the original queue time is kept so the batching wait isn't
// restarted by an upgrade.
const owe = (
  ev: AlertEvent,
  kind: AlertNoticeKind,
  rank: number,
  urgent: boolean,
  nowMs: number,
): AlertEvent => {
  const existing = ev.pending;
  if (existing && noticePriority(existing.kind) < noticePriority(kind)) return ev;
  return {
    ...ev,
    pending: { kind, rank, urgent, queuedAtMs: existing?.queuedAtMs ?? nowMs },
  };
};

// "It got worse": an escalation if the user has heard about this event
// before, otherwise it's their first message and must read as breaking.
const oweWorse = (ev: AlertEvent, s: HazardSignal, rank: number, nowMs: number) =>
  owe(ev, ev.toldRank >= 0 ? 'escalation' : 'breaking', rank, rank >= s.urgentRank, nowMs);

const openEvent = (s: HazardSignal, nowMs: number): AlertEvent | null => {
  const fresh: AlertEvent = {
    key: s.key,
    placeId: s.placeId,
    hazard: s.hazard,
    stage: 'active',
    openedAtMs: nowMs,
    latestValue: s.currentValue,
    forecast: s.forecast,
    toldRank: -1,
    toldStartMs: null,
    belowSinceMs: null,
    clearedAtMs: null,
    allClearSent: false,
    lastImmediateAtMs: null,
    pending: null,
  };
  if (isAbove(s)) {
    return owe(fresh, 'breaking', s.currentRank!, s.currentRank! >= s.urgentRank, nowMs);
  }
  if (s.forecastAvailable && s.forecast) {
    return owe({ ...fresh, stage: 'forecast' }, 'preview', s.forecast.peakRank, false, nowMs);
  }
  return null;
};

const advanceForecast = (ev: AlertEvent, s: HazardSignal, nowMs: number): AlertEvent | null => {
  if (isAbove(s)) {
    const live: AlertEvent = { ...ev, stage: 'active', belowSinceMs: null, forecast: s.forecast };
    // Never told anything yet: the queued heads-up is moot, say it's here.
    // owe() replaces it (breaking outranks preview) but keeps its queue
    // time, so the batching wait already served still counts.
    if (ev.toldRank < 0) {
      return owe(live, 'breaking', s.currentRank!, s.currentRank! >= s.urgentRank, nowMs);
    }
    // Told: the heads-up came true. Any queued cancel/update no longer
    // applies; only a level beyond what they were told is news.
    const settled = { ...live, pending: null };
    return s.currentRank! > ev.toldRank ? oweWorse(settled, s, s.currentRank!, nowMs) : settled;
  }

  // No forecast to judge by (fetch failed): don't read it as "no breach".
  if (!s.forecastAvailable) return ev;

  if (s.forecast) {
    let next: AlertEvent = { ...ev, forecast: s.forecast };
    if (next.stage === 'cancelled') {
      // Back before the cancellation went out — as if it never happened.
      next = { ...next, stage: 'forecast', pending: null };
    }
    if (next.toldRank < 0) {
      // Still waiting to send the first heads-up: refresh it in place
      // (owe keeps its original queue time).
      return owe(next, 'preview', s.forecast.peakRank, false, nowMs);
    }
    if (s.forecast.peakRank > knownRank(next)) {
      return owe(next, 'escalation', s.forecast.peakRank, false, nowMs);
    }
    const movedEarlier =
      next.toldStartMs !== null &&
      s.forecast.startMs < next.toldStartMs - ALERT_EVENT_CONFIG.earlierStartUpdateMs;
    if (movedEarlier && !next.pending) {
      return owe(next, 'escalation', Math.max(next.toldRank, s.forecast.peakRank), false, nowMs);
    }
    return next;
  }

  // The forecast no longer reaches the level.
  if (ev.toldRank < 0) return null; // never told — drop quietly
  if (ev.stage === 'cancelled') return ev;
  return owe(
    { ...ev, stage: 'cancelled', forecast: null, pending: null },
    'cancelled',
    ev.toldRank,
    false,
    nowMs,
  );
};

const advanceLive = (ev: AlertEvent, s: HazardSignal, nowMs: number): AlertEvent => {
  if (isAbove(s)) {
    const next: AlertEvent = { ...ev, stage: 'active', belowSinceMs: null };
    return s.currentRank! > knownRank(next) ? oweWorse(next, s, s.currentRank!, nowMs) : next;
  }
  if (!isBelow(s)) return ev; // reading unavailable — hold still

  const belowSinceMs = ev.stage === 'easing' ? ev.belowSinceMs ?? nowMs : nowMs;
  const easing: AlertEvent = { ...ev, stage: 'easing', belowSinceMs };
  const sustained = nowMs - belowSinceMs >= ALERT_EVENT_CONFIG.clearAfterMs;
  if (!sustained || s.forecastBreachSoon) return easing;

  const cleared: AlertEvent = {
    ...easing,
    stage: 'cleared',
    clearedAtMs: nowMs,
    forecast: null,
    // A live notice still waiting (e.g. held by quiet hours) is moot now.
    pending: null,
  };
  return s.allClearWanted && ev.toldRank >= 0
    ? owe(cleared, 'cleared', ev.toldRank, false, nowMs)
    : cleared;
};

const advanceCleared = (ev: AlertEvent, s: HazardSignal, nowMs: number): AlertEvent => {
  if (!isAbove(s)) return ev; // within the merge window, forecasts don't reopen it

  const reopened: AlertEvent = {
    ...ev,
    stage: 'active',
    clearedAtMs: null,
    belowSinceMs: null,
    allClearSent: false,
    // An all clear that never went out is simply withdrawn.
    pending: ev.pending?.kind === 'cleared' ? null : ev.pending,
  };
  // They were told it's over — a return must be announced, even at the
  // same level, or the all clear would stand uncorrected.
  if (ev.allClearSent) {
    return owe(reopened, 'breaking', s.currentRank!, s.currentRank! >= s.urgentRank, nowMs);
  }
  return s.currentRank! > knownRank(reopened)
    ? oweWorse(reopened, s, s.currentRank!, nowMs)
    : reopened;
};

export const advanceEvent = (
  prev: AlertEvent | null,
  s: HazardSignal,
  nowMs: number,
): AlertEvent | null => {
  const expired =
    prev?.stage === 'cleared' &&
    prev.clearedAtMs !== null &&
    nowMs - prev.clearedAtMs > ALERT_EVENT_CONFIG.mergeWindowMs;
  if (!prev || expired) return openEvent(s, nowMs);

  const ev: AlertEvent = { ...prev, latestValue: s.currentValue ?? prev.latestValue };
  switch (ev.stage) {
    case 'forecast':
    case 'cancelled':
      return advanceForecast(ev, s, nowMs);
    case 'active':
    case 'easing':
      return advanceLive(ev, s, nowMs);
    case 'cleared':
      return advanceCleared(ev, s, nowMs);
  }
};

// Which message a pending notice joins. A forecast-stage escalation is a
// heads-up update, so it travels with the previews, not the live alerts.
export const noticeGroupOf = (ev: AlertEvent): AlertMessageGroup | null => {
  switch (ev.pending?.kind) {
    case 'preview':
      return 'preview';
    case 'escalation':
      return ev.stage === 'forecast' ? 'preview' : 'live';
    case 'breaking':
      return 'live';
    case 'cancelled':
      return 'cancelled';
    case 'cleared':
      return 'cleared';
    default:
      return null;
  }
};

// A notice can sit in the queue (batching, quiet hours, cooldown, daily
// cap) while the event moves on. Only send it if it is still true.
export const isNoticeStillTrue = (ev: AlertEvent): boolean => {
  switch (ev.pending?.kind) {
    case 'preview':
      return ev.stage === 'forecast' && ev.forecast !== null;
    case 'escalation':
      return ev.stage === 'forecast' ? ev.forecast !== null : ev.stage === 'active';
    case 'breaking':
      return ev.stage === 'active';
    case 'cancelled':
      return ev.stage === 'cancelled';
    case 'cleared':
      return ev.stage === 'cleared';
    default:
      return false;
  }
};

// Records a delivered notice. Returns null for a delivered cancellation —
// the event has nothing left to say.
export const markNoticeDelivered = (ev: AlertEvent, nowMs: number): AlertEvent | null => {
  const notice = ev.pending;
  if (!notice) return ev;
  if (notice.kind === 'cancelled') return null;

  const group = noticeGroupOf(ev);
  return {
    ...ev,
    pending: null,
    toldRank: Math.max(ev.toldRank, notice.rank),
    lastImmediateAtMs: group === 'live' ? nowMs : ev.lastImmediateAtMs,
    toldStartMs: group === 'preview' ? ev.forecast?.startMs ?? ev.toldStartMs : ev.toldStartMs,
    allClearSent: notice.kind === 'cleared' ? true : ev.allClearSent,
  };
};
