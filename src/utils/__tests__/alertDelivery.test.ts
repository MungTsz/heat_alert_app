import { AlertEvent, AlertMessage } from '../../types/alerts';
import { QuietHours } from '../../types/settings';
import {
  applyDailyCap,
  countSentToday,
  isInQuietHours,
  selectDueEvents,
} from '../alertDelivery';

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
// HKT wall-clock time on 4 Nov 2026 → epoch ms
const hkt = (hour: number, minute = 0) => Date.UTC(2026, 10, 4, hour - 8, minute);

const QUIET: QuietHours = { enabled: true, startMinute: 23 * 60, endMinute: 7 * 60 };
const NOON = hkt(12);

const event = (over: Partial<AlertEvent> = {}): AlertEvent => ({
  key: 'home|aqhi',
  placeId: 'home',
  hazard: 'aqhi',
  stage: 'active',
  openedAtMs: NOON,
  latestValue: 8,
  forecast: null,
  toldRank: -1,
  toldStartMs: null,
  belowSinceMs: null,
  clearedAtMs: null,
  allClearSent: false,
  lastImmediateAtMs: null,
  pending: { kind: 'breaking', rank: 3, urgent: false, queuedAtMs: NOON },
  ...over,
});

describe('isInQuietHours', () => {
  it('handles hours that wrap past midnight', () => {
    expect(isInQuietHours(hkt(23, 30), QUIET)).toBe(true);
    expect(isInQuietHours(hkt(6, 59), QUIET)).toBe(true);
    expect(isInQuietHours(hkt(7), QUIET)).toBe(false);
    expect(isInQuietHours(NOON, QUIET)).toBe(false);
  });

  it('is never quiet when switched off', () => {
    expect(isInQuietHours(hkt(2), { ...QUIET, enabled: false })).toBe(false);
  });
});

describe('selectDueEvents', () => {
  const ctx = (nowMs: number, flush = false) => ({ nowMs, quietHours: QUIET, flush });

  it('waits out the batching window before sending', () => {
    expect(selectDueEvents([event()], ctx(NOON + 5 * MIN)).due).toHaveLength(0);
    expect(selectDueEvents([event()], ctx(NOON + 10 * MIN)).due).toHaveLength(1);
  });

  it('sends at once when flushed', () => {
    expect(selectDueEvents([event()], ctx(NOON, true)).due).toHaveLength(1);
  });

  it('sends urgent alerts at once, even in quiet hours', () => {
    const night = hkt(2);
    const urgent = event({ pending: { kind: 'breaking', rank: 4, urgent: true, queuedAtMs: night } });
    const normal = event({ key: 'office|aqhi', placeId: 'office', pending: { kind: 'breaking', rank: 3, urgent: false, queuedAtMs: night - HOUR } });
    const { due } = selectDueEvents([urgent, normal], ctx(night));
    expect(due.map(ev => ev.key)).toEqual(['home|aqhi']);
  });

  it('takes other waiting notices along with an urgent one', () => {
    const urgent = event({ pending: { kind: 'breaking', rank: 4, urgent: true, queuedAtMs: NOON } });
    const normal = event({ key: 'office|aqhi', placeId: 'office' });
    expect(selectDueEvents([urgent, normal], ctx(NOON)).due).toHaveLength(2);
  });

  it('holds a live alert during the per-event cooldown', () => {
    const cooling = event({
      toldRank: 2,
      lastImmediateAtMs: NOON - HOUR,
      pending: { kind: 'escalation', rank: 3, urgent: false, queuedAtMs: NOON - HOUR },
    });
    expect(selectDueEvents([cooling], ctx(NOON)).due).toHaveLength(0);
    expect(selectDueEvents([cooling], ctx(NOON + 2 * HOUR)).due).toHaveLength(1);
  });

  it('withdraws a notice that is no longer true', () => {
    const stale = event({ stage: 'easing' });
    const { events, due } = selectDueEvents([stale], ctx(NOON + HOUR));
    expect(due).toHaveLength(0);
    expect(events[0].pending).toBeNull();
  });
});

const message = (id: string, priority: number, urgent = false): AlertMessage => ({
  id,
  group: 'live',
  priority,
  urgent,
  title: id,
  body: id,
  eventKeys: [],
});

describe('applyDailyCap', () => {
  it('keeps the most important messages up to the cap', () => {
    const kept = applyDailyCap([message('clear', 5), message('live', 2), message('preview', 3)], 1);
    expect(kept.map(m => m.id)).toEqual(['live', 'preview']);
  });

  it('never caps urgent messages', () => {
    expect(applyDailyCap([message('urgent', 0, true)], 3)).toHaveLength(1);
  });
});

describe('countSentToday', () => {
  it('counts only non-urgent messages from today in Hong Kong', () => {
    const log = [
      { atMs: hkt(0, 30), urgent: false },
      { atMs: hkt(9), urgent: true },
      { atMs: hkt(0) - HOUR, urgent: false }, // 11 pm yesterday HKT
    ];
    expect(countSentToday(log, NOON)).toBe(1);
  });
});
