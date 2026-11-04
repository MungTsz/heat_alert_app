import { AlertEvent, ForecastWindow } from '../../types/alerts';
import { HazardSignal } from '../alertSignals';
import {
  advanceEvent,
  isNoticeStillTrue,
  markNoticeDelivered,
  noticeGroupOf,
} from '../alertEvents';
import { rankOf } from '../hazardLevels';

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
// 2 pm HKT, 4 Nov 2026
const T0 = Date.UTC(2026, 10, 4, 6);

// AQHI ranks: Low 0, Moderate 1, High 2, Very High 3, Serious 4.
const HIGH = 2;
const VERY_HIGH = 3;
const SERIOUS = 4;

const window = (startMs: number, maxValue: number, minValue = maxValue): ForecastWindow => ({
  startMs,
  endMs: startMs + 3 * HOUR,
  minValue,
  maxValue,
  peakRank: rankOf('aqhi', maxValue),
});

const signal = (over: Partial<HazardSignal> = {}): HazardSignal => ({
  key: 'home|aqhi',
  placeId: 'home',
  hazard: 'aqhi',
  thresholdRank: HIGH,
  urgentRank: SERIOUS,
  currentValue: null,
  currentRank: null,
  forecastAvailable: true,
  forecast: null,
  forecastBreachSoon: false,
  allClearWanted: true,
  ...over,
});

const reading = (value: number): Partial<HazardSignal> => ({
  currentValue: value,
  currentRank: rankOf('aqhi', value),
});

const deliver = (ev: AlertEvent | null, nowMs: number): AlertEvent => {
  const told = markNoticeDelivered(ev!, nowMs);
  if (!told) throw new Error('event was removed');
  return told;
};

describe('opening an event', () => {
  it('owes a breaking alert when a reading reaches the level with no heads-up', () => {
    const ev = advanceEvent(null, signal(reading(7)), T0);
    expect(ev?.stage).toBe('active');
    expect(ev?.pending).toEqual({ kind: 'breaking', rank: HIGH, urgent: false, queuedAtMs: T0 });
  });

  it('marks a Serious reading urgent', () => {
    expect(advanceEvent(null, signal(reading(11)), T0)?.pending?.urgent).toBe(true);
  });

  it('opens a heads-up from a forecast breach', () => {
    const ev = advanceEvent(null, signal({ ...reading(4), forecast: window(T0 + 20 * HOUR, 9) }), T0);
    expect(ev?.stage).toBe('forecast');
    expect(ev?.pending).toMatchObject({ kind: 'preview', rank: VERY_HIGH, urgent: false });
  });

  it('does nothing below the level with no breach ahead', () => {
    expect(advanceEvent(null, signal(reading(5)), T0)).toBeNull();
  });

  it('ignores a level below the place threshold', () => {
    expect(advanceEvent(null, signal({ ...reading(7), thresholdRank: VERY_HIGH }), T0)).toBeNull();
  });
});

describe('a heads-up that comes true', () => {
  const told = deliver(
    advanceEvent(null, signal({ ...reading(4), forecast: window(T0 + 2 * HOUR, 8, 7) }), T0),
    T0,
  );

  it('stays silent when the reading is no worse than the heads-up', () => {
    const ev = advanceEvent(told, signal(reading(8)), T0 + 3 * HOUR);
    expect(ev?.stage).toBe('active');
    expect(ev?.pending).toBeNull();
  });

  it('escalates when the reading is worse than the heads-up', () => {
    const ev = advanceEvent(told, signal(reading(11)), T0 + 3 * HOUR);
    expect(ev?.pending).toMatchObject({ kind: 'escalation', rank: SERIOUS, urgent: true });
    expect(noticeGroupOf(ev!)).toBe('live');
  });

  it('turns a heads-up still waiting to go out into a breaking alert', () => {
    const queued = advanceEvent(null, signal({ ...reading(4), forecast: window(T0 + HOUR, 7) }), T0);
    const ev = advanceEvent(queued, signal(reading(7)), T0 + 5 * MIN);
    expect(ev?.pending).toMatchObject({ kind: 'breaking', rank: HIGH, queuedAtMs: T0 });
  });
});

describe('heads-up updates and cancellations', () => {
  const start = T0 + 20 * HOUR;
  const told = deliver(advanceEvent(null, signal({ ...reading(4), forecast: window(start, 7) }), T0), T0);

  it('sends an update when the forecast gets worse', () => {
    const ev = advanceEvent(told, signal({ ...reading(4), forecast: window(start, 9) }), T0 + HOUR);
    expect(ev?.pending).toMatchObject({ kind: 'escalation', rank: VERY_HIGH });
    expect(noticeGroupOf(ev!)).toBe('preview');
  });

  it('sends an update when the start moves notably earlier', () => {
    const ev = advanceEvent(told, signal({ ...reading(4), forecast: window(start - 3 * HOUR, 7) }), T0 + HOUR);
    expect(ev?.pending?.kind).toBe('escalation');
  });

  it('stays quiet for a small shift in start time', () => {
    const ev = advanceEvent(told, signal({ ...reading(4), forecast: window(start - HOUR, 7) }), T0 + HOUR);
    expect(ev?.pending).toBeNull();
  });

  it('cancels out loud when the forecast no longer reaches the level', () => {
    const ev = advanceEvent(told, signal(reading(4)), T0 + HOUR);
    expect(ev?.stage).toBe('cancelled');
    expect(ev?.pending?.kind).toBe('cancelled');
    expect(markNoticeDelivered(ev!, T0 + HOUR)).toBeNull();
  });

  it('drops a heads-up the user was never told about without a message', () => {
    const queued = advanceEvent(null, signal({ ...reading(4), forecast: window(start, 7) }), T0);
    expect(advanceEvent(queued, signal(reading(4)), T0 + 5 * MIN)).toBeNull();
  });

  it('keeps the event when the forecast fetch failed instead of cancelling', () => {
    const ev = advanceEvent(told, signal({ ...reading(4), forecastAvailable: false }), T0 + HOUR);
    expect(ev?.stage).toBe('forecast');
    expect(ev?.pending).toBeNull();
  });
});

describe('easing and all clear', () => {
  const live = deliver(advanceEvent(null, signal(reading(8)), T0), T0);

  it('waits the sustained period before clearing', () => {
    const easing = advanceEvent(live, signal(reading(5)), T0 + HOUR);
    expect(easing?.stage).toBe('easing');
    const stillEasing = advanceEvent(easing, signal(reading(5)), T0 + 3 * HOUR);
    expect(stillEasing?.stage).toBe('easing');
    const cleared = advanceEvent(stillEasing, signal(reading(5)), T0 + 4 * HOUR);
    expect(cleared?.stage).toBe('cleared');
    expect(cleared?.pending?.kind).toBe('cleared');
  });

  it('clears silently when the place does not want an all clear', () => {
    const easing = advanceEvent(live, signal({ ...reading(5), allClearWanted: false }), T0 + HOUR);
    const cleared = advanceEvent(easing, signal({ ...reading(5), allClearWanted: false }), T0 + 5 * HOUR);
    expect(cleared?.stage).toBe('cleared');
    expect(cleared?.pending).toBeNull();
  });

  it('does not clear while the forecast breaches again soon', () => {
    const easing = advanceEvent(live, signal(reading(5)), T0 + HOUR);
    const ev = advanceEvent(easing, signal({ ...reading(5), forecastBreachSoon: true }), T0 + 5 * HOUR);
    expect(ev?.stage).toBe('easing');
  });

  it('goes back to active without a message when it rises again at the told level', () => {
    const easing = advanceEvent(live, signal(reading(5)), T0 + HOUR);
    const ev = advanceEvent(easing, signal(reading(8)), T0 + 2 * HOUR);
    expect(ev?.stage).toBe('active');
    expect(ev?.pending).toBeNull();
  });

  it('holds still when the reading is unavailable', () => {
    const easing = advanceEvent(live, signal(reading(5)), T0 + HOUR);
    expect(advanceEvent(easing, signal(), T0 + 9 * HOUR)).toEqual({ ...easing, latestValue: 5 });
  });
});

describe('returning after an all clear', () => {
  const live = deliver(advanceEvent(null, signal(reading(8)), T0), T0);
  const easing = advanceEvent(live, signal(reading(5)), T0 + HOUR);
  const cleared = advanceEvent(easing, signal(reading(5)), T0 + 5 * HOUR)!;

  it('announces a return once the all clear was delivered', () => {
    const toldClear = deliver(cleared, T0 + 5 * HOUR);
    const ev = advanceEvent(toldClear, signal(reading(8)), T0 + 6 * HOUR);
    expect(ev?.pending?.kind).toBe('breaking');
  });

  it('continues silently when no all clear went out', () => {
    const silent = { ...cleared, pending: null };
    const ev = advanceEvent(silent, signal(reading(8)), T0 + 6 * HOUR);
    expect(ev?.stage).toBe('active');
    expect(ev?.pending).toBeNull();
  });

  it('starts a brand-new event after the merge window', () => {
    const silent = { ...cleared, pending: null };
    const ev = advanceEvent(silent, signal(reading(8)), T0 + 12 * HOUR);
    expect(ev?.openedAtMs).toBe(T0 + 12 * HOUR);
    expect(ev?.pending?.kind).toBe('breaking');
  });
});

describe('notice validity', () => {
  it('treats a queued breaking alert as stale once the reading eased', () => {
    const queued = advanceEvent(null, signal(reading(7)), T0)!;
    const eased = advanceEvent(queued, signal(reading(5)), T0 + 5 * MIN)!;
    expect(eased.pending?.kind).toBe('breaking');
    expect(isNoticeStillTrue(eased)).toBe(false);
  });

  it('records what was told on delivery', () => {
    const told = deliver(advanceEvent(null, signal(reading(9)), T0), T0 + MIN);
    expect(told.toldRank).toBe(VERY_HIGH);
    expect(told.lastImmediateAtMs).toBe(T0 + MIN);
    expect(told.pending).toBeNull();
  });
});
