import { AlertEvent, PlaceAlertProfile } from '../../types/alerts';
import { DEFAULT_PLACE_ALERT_PROFILE } from '../../config/alertConfig';
import {
  AlertPlace,
  buildSampleMessage,
  composeDigest,
  composeMessages,
  describeRange,
  describeStart,
  formatPlaceList,
} from '../alertMessages';

const HOUR = 60 * 60 * 1000;
const hkt = (day: number, hour: number, minute = 0) => Date.UTC(2026, 10, day, hour - 8, minute);
const NOW = hkt(4, 12); // Wed 4 Nov 2026, noon HKT

const place = (id: string, label: string, profile: Partial<PlaceAlertProfile> = {}): AlertPlace => ({
  id,
  label,
  profile: { ...DEFAULT_PLACE_ALERT_PROFILE, ...profile },
});

const PLACES: Record<string, AlertPlace> = {
  mum: place('mum', "Mum's home", { audience: 'sensitive', caringFor: 'family' }),
  office: place('office', 'Office'),
  school: place('school', 'School', { audience: 'sensitive' }),
};

const event = (over: Partial<AlertEvent> & Pick<AlertEvent, 'placeId' | 'hazard'>): AlertEvent => ({
  key: `${over.placeId}|${over.hazard}`,
  stage: 'active',
  openedAtMs: NOW,
  latestValue: null,
  forecast: null,
  toldRank: -1,
  toldStartMs: null,
  belowSinceMs: null,
  clearedAtMs: null,
  allClearSent: false,
  lastImmediateAtMs: null,
  pending: null,
  ...over,
});

describe('formatPlaceList', () => {
  it('names up to three places, then counts the rest', () => {
    expect(formatPlaceList(['Home'])).toBe('Home');
    expect(formatPlaceList(['Home', 'Office'])).toBe('Home and Office');
    expect(formatPlaceList(['A', 'B', 'C'])).toBe('A, B and C');
    expect(formatPlaceList(['A', 'B', 'C', 'D', 'E'])).toBe('A, B, C and 2 more places');
  });

  it('names a place once even when both hazards hit it', () => {
    expect(formatPlaceList(['Home', 'Home'])).toBe('Home');
  });
});

describe('describeRange / describeStart', () => {
  it('describes AQHI with its numbers and heat with its peak', () => {
    expect(describeRange('aqhi', 7, 10)).toBe('High to Very High (7-10)');
    expect(describeRange('aqhi', 8, 8)).toBe('Very High (8)');
    expect(describeRange('heat', 35, 41)).toBe('Extreme Caution to Danger (up to 41°C)');
  });

  it('says today, tomorrow or the weekday in Hong Kong time', () => {
    expect(describeStart(hkt(4, 15), NOW)).toBe('from about 3 pm today');
    expect(describeStart(hkt(5, 14), NOW)).toBe('from about 2 pm tomorrow');
    expect(describeStart(hkt(6, 9), NOW)).toBe('from about 9 am on Fri');
  });
});

describe('composeMessages', () => {
  it('writes a heads-up with a call-them action for a family place', () => {
    const [msg] = composeMessages(
      [
        event({
          placeId: 'mum',
          hazard: 'aqhi',
          stage: 'forecast',
          forecast: { startMs: hkt(5, 14), endMs: hkt(5, 18), minValue: 7, maxValue: 9, peakRank: 3 },
          pending: { kind: 'preview', rank: 3, urgent: false, queuedAtMs: NOW },
        }),
      ],
      PLACES,
      NOW,
    );
    expect(msg.title).toBe('Air quality heads-up: Very High');
    expect(msg.body).toBe(
      "Mum's home: expected High to Very High (7-9) from about 2 pm tomorrow. Call to remind them to stay indoors and cut down outdoor exertion.",
    );
    expect(msg.group).toBe('preview');
  });

  it('merges several places into one live alert, worst place first', () => {
    const messages = composeMessages(
      [
        event({ placeId: 'office', hazard: 'aqhi', latestValue: 8, pending: { kind: 'breaking', rank: 3, urgent: false, queuedAtMs: NOW } }),
        event({ placeId: 'school', hazard: 'aqhi', latestValue: 9, pending: { kind: 'breaking', rank: 3, urgent: false, queuedAtMs: NOW } }),
      ],
      PLACES,
      NOW,
    );
    expect(messages).toHaveLength(1);
    expect(messages[0].body).toMatch(/^Office and School: Very High \(8\) now\./);
    expect(messages[0].eventKeys).toEqual(['office|aqhi', 'school|aqhi']);
  });

  it('merges poor air and heat into one double-risk message with the combined advice', () => {
    const [msg] = composeMessages(
      [
        event({ placeId: 'office', hazard: 'aqhi', latestValue: 8, pending: { kind: 'breaking', rank: 3, urgent: false, queuedAtMs: NOW } }),
        event({ placeId: 'office', hazard: 'heat', latestValue: 41, pending: { kind: 'breaking', rank: 3, urgent: false, queuedAtMs: NOW } }),
      ],
      PLACES,
      NOW,
    );
    expect(msg.title).toBe('Poor air quality and heat now');
    expect(msg.body).toBe(
      'Office: air quality Very High (8), heat index Danger (41°C). Stay indoors with air conditioning and windows closed, or go to a public cooling centre. Drink water.',
    );
  });

  it('marks a message urgent and top priority when any part is urgent', () => {
    const [msg] = composeMessages(
      [event({ placeId: 'office', hazard: 'aqhi', latestValue: 11, toldRank: 3, pending: { kind: 'escalation', rank: 4, urgent: true, queuedAtMs: NOW } })],
      PLACES,
      NOW,
    );
    expect(msg.urgent).toBe(true);
    expect(msg.priority).toBe(0);
    expect(msg.title).toBe('Air quality up to Serious (10+)');
    expect(msg.body).toContain('Everyone should cut down outdoor activity');
  });

  it('keeps cancellations and all clears as separate, lower-priority messages', () => {
    const messages = composeMessages(
      [
        event({ placeId: 'mum', hazard: 'aqhi', stage: 'cancelled', toldRank: 2, pending: { kind: 'cancelled', rank: 2, urgent: false, queuedAtMs: NOW } }),
        event({ placeId: 'office', hazard: 'heat', stage: 'cleared', latestValue: 30, toldRank: 3, pending: { kind: 'cleared', rank: 3, urgent: false, queuedAtMs: NOW } }),
      ],
      PLACES,
      NOW,
    );
    expect(messages.map(m => m.title)).toEqual([
      'Heads-up cancelled: air quality',
      'All clear: heat index',
    ]);
    expect(messages[1].body).toBe('Office: back to Caution (30°C). Normal activities can resume.');
  });
});

describe('buildSampleMessage', () => {
  it('is clearly marked and carries no readings', () => {
    const msg = buildSampleMessage(PLACES.mum, NOW);
    expect(msg.title).toBe('Sample · Heads-up: poor air quality and heat');
    expect(msg.body).toContain("Mum's home");
    expect(msg.body).toContain('from about 2 pm tomorrow');
    expect(msg.body).not.toMatch(/\(\d/);
    expect(msg.eventKeys).toEqual([]);
  });
});

// Keeps the helper honest about hour math used above.
it('hkt helper lands on the intended HK hour', () => {
  expect(new Date(NOW + 8 * HOUR).getUTCHours()).toBe(12);
});

describe('composeDigest', () => {
  const MORNING = hkt(5, 7, 30);
  const ongoing = event({
    placeId: 'office',
    hazard: 'aqhi',
    stage: 'active',
    openedAtMs: hkt(4, 15),
    latestValue: 8,
    toldRank: 3,
  });

  it('reminds about an episode still going on, with the day count', () => {
    const msg = composeDigest({
      slot: 'morning',
      due: [],
      events: [ongoing],
      places: PLACES,
      nowMs: MORNING,
      noEventDays: 'silent',
    });
    expect(msg?.title).toBe('Today: air quality Very High');
    expect(msg?.body).toMatch(/^Office: Very High \(8\), day 2\./);
    expect(msg?.id).toBe(`digest:morning:${MORNING}`);
  });

  it('merges new heads-ups and the today reminder into one push, today first', () => {
    const preview = event({
      placeId: 'mum',
      hazard: 'heat',
      stage: 'forecast',
      forecast: { startMs: hkt(6, 13), endMs: hkt(6, 17), minValue: 35, maxValue: 40, peakRank: 3 },
      pending: { kind: 'preview', rank: 3, urgent: false, queuedAtMs: MORNING },
    });
    const msg = composeDigest({
      slot: 'morning',
      due: [preview],
      events: [ongoing, preview],
      places: PLACES,
      nowMs: MORNING,
      noEventDays: 'silent',
    });
    expect(msg?.group).toBe('digest');
    expect(msg?.title).toBe('Today: air quality Very High');
    expect(msg?.body.split('\n')).toHaveLength(2);
    expect(msg?.eventKeys.sort()).toEqual(['mum|heat', 'office|aqhi']);
  });

  it('stays silent on a quiet day unless the summary is on', () => {
    const params = { slot: 'morning' as const, due: [], events: [], places: PLACES, nowMs: MORNING };
    expect(composeDigest({ ...params, noEventDays: 'silent' })).toBeNull();
    expect(composeDigest({ ...params, noEventDays: 'summary' })?.title).toBe('No alerts today');
    expect(composeDigest({ ...params, slot: 'evening', noEventDays: 'summary' })).toBeNull();
  });
});
