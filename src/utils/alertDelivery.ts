// src/utils/alertDelivery.ts
import { AlertEvent, AlertMessage } from '../types/alerts';
import { QuietHours } from '../types/settings';
import { ALERT_DELIVERY_CONFIG } from '../config/alertConfig';
import { toHkDateKey, toHkTimestamp } from './hkDate';
import { isNoticeStillTrue, noticeGroupOf } from './alertEvents';

// Delivery rules: decide which owed notices go out now. Pure, like the
// event machine — the caller passes the clock and the delivery log.

export type DeliveryLogEntry = { atMs: number; urgent: boolean };

const MINUTES_PER_HOUR = 60;

// Minutes after midnight, Hong Kong time — quiet hours are set in HK time
// whatever timezone the phone is in. HK's offset is whole hours, so the
// minute is the same as UTC's.
const hkMinuteOfDay = (nowMs: number): number => {
  const date = new Date(nowMs);
  const hour = Number(toHkTimestamp(date).slice(8, 10));
  return hour * MINUTES_PER_HOUR + date.getUTCMinutes();
};

export const isInQuietHours = (nowMs: number, quietHours: QuietHours): boolean => {
  if (!quietHours.enabled || quietHours.startMinute === quietHours.endMinute) return false;
  const minute = hkMinuteOfDay(nowMs);
  const { startMinute, endMinute } = quietHours;
  return startMinute < endMinute
    ? minute >= startMinute && minute < endMinute
    : minute >= startMinute || minute < endMinute; // wraps past midnight
};

// Non-urgent messages already shown today (HK calendar day).
export const countSentToday = (log: readonly DeliveryLogEntry[], nowMs: number): number => {
  const today = toHkDateKey(new Date(nowMs));
  return log.filter(entry => !entry.urgent && toHkDateKey(new Date(entry.atMs)) === today).length;
};

export const pruneDeliveryLog = (
  log: readonly DeliveryLogEntry[],
  nowMs: number,
): DeliveryLogEntry[] =>
  log.filter(entry => nowMs - entry.atMs < ALERT_DELIVERY_CONFIG.logRetentionMs);

const inCooldown = (ev: AlertEvent, nowMs: number): boolean =>
  noticeGroupOf(ev) === 'live' &&
  ev.lastImmediateAtMs !== null &&
  nowMs - ev.lastImmediateAtMs < ALERT_DELIVERY_CONFIG.immediateCooldownMs;

export type DueSelection = {
  // The input events with any no-longer-true notice withdrawn.
  events: AlertEvent[];
  // Events whose notice should be composed and sent now.
  due: AlertEvent[];
};

export type DeliveryContext = {
  nowMs: number;
  quietHours: QuietHours;
  // Skip the batching wait (manual "run check now").
  flush?: boolean;
  // A scheduled digest goes out in this run: everything waiting joins it,
  // whatever the batching, quiet hours or cooldown say — the user picked
  // this time to hear from the app.
  digestNow?: boolean;
  // When the next digest is due; null/undefined = no digests enabled, so
  // nothing waits for one.
  nextDigestAtMs?: number | null;
  // false = "it got worse" alerts wait for the digest too (urgent excepted).
  breakingUpdates?: boolean;
};

// The time a notice is about, if any: the forecast start for a heads-up,
// the told start for a cancellation.
const noticeStartMs = (ev: AlertEvent): number | null => {
  switch (noticeGroupOf(ev)) {
    case 'preview':
      return ev.forecast?.startMs ?? null;
    case 'cancelled':
      return ev.toldStartMs;
    default:
      return null;
  }
};

// Heads-ups and cancellations go in the next digest (design doc: "first a
// forecast, then confirmation", without a push every time a forecast run
// shifts). But a digest after the event starts would be useless, so a
// notice about something starting sooner goes out as it would without
// digests.
const waitsForDigest = (ev: AlertEvent, ctx: DeliveryContext): boolean => {
  if (ev.pending!.urgent) return false;
  const group = noticeGroupOf(ev);
  const digestKind =
    group === 'preview' || group === 'cancelled' || (group === 'live' && ctx.breakingUpdates === false);
  if (!digestKind || ctx.nextDigestAtMs === null || ctx.nextDigestAtMs === undefined) return false;
  const startMs = noticeStartMs(ev);
  return startMs === null || startMs >= ctx.nextDigestAtMs;
};

export const selectDueEvents = (
  events: readonly AlertEvent[],
  ctx: DeliveryContext,
): DueSelection => {
  const { nowMs } = ctx;
  const cleaned = events.map(ev =>
    ev.pending && !isNoticeStillTrue(ev) ? { ...ev, pending: null } : ev,
  );
  const waiting = cleaned.filter(ev => ev.pending !== null);
  if (ctx.digestNow) return { events: cleaned, due: waiting };

  const immediate = waiting.filter(ev => !waitsForDigest(ev, ctx));
  const urgent = immediate.filter(ev => ev.pending!.urgent);
  const eligible = isInQuietHours(nowMs, ctx.quietHours)
    ? []
    : immediate.filter(ev => !ev.pending!.urgent && !inCooldown(ev, nowMs));

  // Send once the oldest notice has waited out the batching window, so
  // other places and the other hazard get the chance to join it. An urgent
  // notice goes at once and takes everything eligible with it.
  const batchReady =
    ctx.flush === true ||
    urgent.length > 0 ||
    eligible.some(ev => nowMs - ev.pending!.queuedAtMs >= ALERT_DELIVERY_CONFIG.batchWindowMs);

  return { events: cleaned, due: batchReady ? [...urgent, ...eligible] : urgent };
};

// Most important first; urgent messages never count towards the cap.
// Messages over the cap aren't lost: their events keep the pending notice
// and are re-checked (and re-validated) on later ticks.
export const applyDailyCap = (
  messages: readonly AlertMessage[],
  sentToday: number,
): AlertMessage[] => {
  let remaining = Math.max(0, ALERT_DELIVERY_CONFIG.dailyCap - sentToday);
  return [...messages]
    .sort((a, b) => a.priority - b.priority)
    .filter(message => {
      if (message.urgent) return true;
      if (remaining === 0) return false;
      remaining--;
      return true;
    });
};
