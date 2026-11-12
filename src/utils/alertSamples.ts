// src/utils/alertSamples.ts
import { AlertEvent, AlertMessage, ForecastWindow, HazardKind, PendingNotice } from '../types/alerts';
import { MESSAGE_COPY } from '../config/alertCopy';
import { addHkDays, parseHkTimestamp, toHkDateKey } from './hkDate';
import { rankOf } from './hazardLevels';
import { urgentRankFor } from './alertProfile';
import { AlertPlace, composeDigest, composeMessages } from './alertMessages';

// One of every message the engine can send, built from made-up events and
// fed through the REAL composers — so what you see on the phone (dev
// "Send every message type") and in the snapshot test is exactly what a
// real episode would produce, worded for your own place.

const HOUR_MS = 60 * 60 * 1000;

export type SampleMessage = { message: AlertMessage; events: AlertEvent[] };

// Hong Kong time `hour` on the day `dayOffset` days from now.
const hkAt = (nowMs: number, dayOffset: number, hour: number): number =>
  parseHkTimestamp(
    `${addHkDays(toHkDateKey(new Date(nowMs)), dayOffset).replace(/-/g, '')}${String(hour).padStart(2, '0')}`,
  );

const windowOf = (
  hazard: HazardKind,
  startMs: number,
  hours: number,
  minValue: number,
  maxValue: number,
): ForecastWindow => ({
  startMs,
  endMs: startMs + hours * HOUR_MS,
  minValue,
  maxValue,
  peakRank: rankOf(hazard, maxValue),
});

export const buildSampleGallery = (
  primary: AlertPlace,
  secondary: AlertPlace,
  nowMs: number,
): SampleMessage[] => {
  const places = { [primary.id]: primary, [secondary.id]: secondary };
  const tomorrow2pm = hkAt(nowMs, 1, 14);

  const event = (
    place: AlertPlace,
    hazard: HazardKind,
    over: Partial<AlertEvent>,
    notice?: Pick<PendingNotice, 'kind' | 'rank'>,
  ): AlertEvent => ({
    key: `${place.id}|${hazard}`,
    placeId: place.id,
    hazard,
    stage: 'active',
    openedAtMs: nowMs,
    latestValue: null,
    forecast: null,
    toldRank: -1,
    toldStartMs: null,
    belowSinceMs: null,
    clearedAtMs: null,
    allClearSent: false,
    lastImmediateAtMs: null,
    pending: notice
      ? { ...notice, urgent: notice.rank >= urgentRankFor(hazard), queuedAtMs: nowMs }
      : null,
    ...over,
  });

  const aqhiWindow = windowOf('aqhi', tomorrow2pm, 4, 7, 9);
  const heatWindow = windowOf('heat', hkAt(nowMs, 1, 12), 5, 35, 41);

  const scenarios: AlertEvent[][] = [
    // Evening heads-up for tomorrow.
    [event(primary, 'aqhi', { stage: 'forecast', forecast: aqhiWindow }, { kind: 'preview', rank: 3 })],
    // The heads-up got worse.
    [
      event(
        primary,
        'aqhi',
        { stage: 'forecast', toldRank: 2, forecast: windowOf('aqhi', tomorrow2pm, 4, 8, 10) },
        { kind: 'escalation', rank: 3 },
      ),
    ],
    // Reached the level with no heads-up.
    [event(primary, 'aqhi', { latestValue: 8 }, { kind: 'breaking', rank: 3 })],
    // Up to Serious — urgent.
    [event(primary, 'aqhi', { latestValue: 11, toldRank: 3 }, { kind: 'escalation', rank: 4 })],
    // Heat now.
    [event(primary, 'heat', { latestValue: 41 }, { kind: 'breaking', rank: 3 })],
    // Poor air and heat together at two places.
    [
      event(primary, 'aqhi', { latestValue: 8 }, { kind: 'breaking', rank: 3 }),
      event(primary, 'heat', { latestValue: 41 }, { kind: 'breaking', rank: 3 }),
      event(secondary, 'aqhi', { latestValue: 7 }, { kind: 'breaking', rank: 2 }),
    ],
    // Heads-up no longer applies.
    [
      event(
        primary,
        'aqhi',
        { stage: 'cancelled', toldRank: 3, toldStartMs: tomorrow2pm, cancelledPeakValue: 5 },
        { kind: 'cancelled', rank: 3 },
      ),
    ],
    // All clear.
    [event(primary, 'aqhi', { stage: 'cleared', latestValue: 5, toldRank: 3 }, { kind: 'cleared', rank: 3 })],
  ];

  const singles = scenarios.flatMap(events =>
    composeMessages(events, places, nowMs).map(message => ({ message, events })),
  );

  // Morning digest: an ongoing episode (day 2) plus a new heat heads-up.
  const morning = hkAt(nowMs, 0, 7) + 30 * 60 * 1000;
  const ongoing = event(primary, 'aqhi', {
    openedAtMs: morning - 18 * HOUR_MS,
    latestValue: 8,
    toldRank: 3,
  });
  const heatPreview = event(secondary, 'heat', { stage: 'forecast', forecast: heatWindow }, { kind: 'preview', rank: 3 });
  const digest = composeDigest({
    slot: 'morning',
    due: [heatPreview],
    events: [ongoing, heatPreview],
    places,
    nowMs: morning,
    noEventDays: 'silent',
  });
  const all = digest ? [...singles, { message: digest, events: [ongoing, heatPreview] }] : singles;

  // Unique ids (two samples of the same group would otherwise collide in
  // the message log) and a clear "Sample" mark on every title.
  return all.map(({ message, events }, i) => ({
    message: {
      ...message,
      id: `sample:${i}:${nowMs}`,
      title: `${MESSAGE_COPY.samplePrefix}${message.title}`,
    },
    events,
  }));
};
