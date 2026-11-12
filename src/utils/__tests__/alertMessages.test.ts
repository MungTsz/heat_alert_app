import { AlertEvent, PlaceAlertProfile } from '../../types/alerts';
import { ALERT_MESSAGE_CONFIG, DEFAULT_PLACE_ALERT_PROFILE } from '../../config/alertConfig';
import {
  AlertPlace,
  adviceProfileFor,
  buildSampleMessage,
  composeDigest,
  composeMessages,
  describeRange,
  describeStart,
  describeWindow,
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
      "Mum's home: expected High to Very High (7-9) from about 2 pm to 6 pm tomorrow. Call to remind them to stay indoors and cut down outdoor exertion.",
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
      'Office: air quality Very High (8), heat index Danger (41°C). Stay indoors with air conditioning and windows closed, or go to a cooling centre. Drink water.',
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
    expect(msg.body).toContain('from about 2 pm to 6 pm tomorrow');
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
    // One line of facts per part, then a single action — not one per line —
    // worded for every place covered: Office (self) and Mum's home (older
    // adult) get the careful advice without "call them".
    expect(msg?.body.split('\n')).toEqual([
      'Office: Very High (8), day 2.',
      "Mum's home: expected Extreme Caution to Danger (up to 40°C) from about 1 pm to 5 pm tomorrow.",
      'Stay indoors where you can and cut down outdoor exertion.',
    ]);
    expect(msg?.eventKeys.sort()).toEqual(['mum|heat', 'office|aqhi']);
  });

  it('stays silent on a quiet day unless the summary is on', () => {
    const params = { slot: 'morning' as const, due: [], events: [], places: PLACES, nowMs: MORNING };
    expect(composeDigest({ ...params, noEventDays: 'silent' })).toBeNull();
    expect(composeDigest({ ...params, noEventDays: 'summary' })?.title).toBe('No alerts today');
    expect(composeDigest({ ...params, slot: 'evening', noEventDays: 'summary' })).toBeNull();
  });
});

describe('describeWindow', () => {
  it('gives the start and end of the window', () => {
    expect(describeWindow(hkt(5, 14), hkt(5, 18), NOW)).toBe('from about 2 pm to 6 pm tomorrow');
  });

  it('names both days when the window crosses midnight', () => {
    expect(describeWindow(hkt(4, 22), hkt(5, 3), NOW)).toBe(
      'from about 10 pm today to 3 am tomorrow',
    );
  });

  it('ends "to midnight" rather than "12 am" the next day', () => {
    expect(describeWindow(hkt(4, 20), hkt(5, 0), NOW)).toBe('from about 8 pm to midnight today');
  });
});

describe('adviceProfileFor', () => {
  it('speaks to a carer only when every place is for family', () => {
    expect(adviceProfileFor([PLACES.mum.profile]).caringFor).toBe('family');
    expect(adviceProfileFor([PLACES.mum.profile, PLACES.office.profile]).caringFor).toBe('self');
  });

  it('gives the more careful advice when audiences differ', () => {
    expect(adviceProfileFor([PLACES.office.profile, PLACES.school.profile]).audience).toBe('sensitive');
    const outdoor = { ...DEFAULT_PLACE_ALERT_PROFILE, audience: 'outdoor' as const };
    // Outdoor-work advice never stands in for an office.
    expect(adviceProfileFor([PLACES.office.profile, outdoor]).audience).toBe('general');
    expect(adviceProfileFor([outdoor, outdoor]).audience).toBe('outdoor');
  });
});

describe('message wording rules', () => {
  const aqhiForecast = (minValue: number, maxValue: number, start = hkt(5, 14), end = hkt(5, 18)) => ({
    startMs: start,
    endMs: end,
    minValue,
    maxValue,
    peakRank: maxValue >= 8 ? 3 : 2,
  });

  it('does not tell a self place to "call them" when merged with a family place', () => {
    const [msg] = composeMessages(
      [
        event({ placeId: 'mum', hazard: 'aqhi', latestValue: 8, pending: { kind: 'breaking', rank: 3, urgent: false, queuedAtMs: NOW } }),
        event({ placeId: 'office', hazard: 'aqhi', latestValue: 8, pending: { kind: 'breaking', rank: 3, urgent: false, queuedAtMs: NOW } }),
      ],
      PLACES,
      NOW,
    );
    expect(msg.body).not.toContain('Call to remind');
    expect(msg.body).toContain('Stay indoors where you can');
  });

  it('says an updated heads-up is worse than before', () => {
    const [msg] = composeMessages(
      [
        event({
          placeId: 'office',
          hazard: 'aqhi',
          stage: 'forecast',
          toldRank: 2,
          forecast: aqhiForecast(8, 9),
          pending: { kind: 'escalation', rank: 3, urgent: false, queuedAtMs: NOW },
        }),
      ],
      PLACES,
      NOW,
    );
    expect(msg.title).toBe('Updated heads-up: air quality Very High');
    expect(msg.body).toMatch(
      /^Office: now expected Very High \(8-9\) from about 2 pm to 6 pm tomorrow, worse than the last heads-up\./,
    );
  });

  it('says an updated heads-up starts earlier when the level is unchanged', () => {
    const [msg] = composeMessages(
      [
        event({
          placeId: 'office',
          hazard: 'aqhi',
          stage: 'forecast',
          toldRank: 3,
          forecast: aqhiForecast(8, 9, hkt(5, 9)),
          pending: { kind: 'escalation', rank: 3, urgent: false, queuedAtMs: NOW },
        }),
      ],
      PLACES,
      NOW,
    );
    expect(msg.body).toContain('earlier than the last heads-up');
  });

  it('puts both hazards’ levels in a double-risk heads-up', () => {
    const [msg] = composeMessages(
      [
        event({ placeId: 'office', hazard: 'aqhi', stage: 'forecast', forecast: aqhiForecast(7, 9), pending: { kind: 'preview', rank: 3, urgent: false, queuedAtMs: NOW } }),
        event({
          placeId: 'office',
          hazard: 'heat',
          stage: 'forecast',
          forecast: { startMs: hkt(5, 13), endMs: hkt(5, 17), minValue: 35, maxValue: 41, peakRank: 3 },
          pending: { kind: 'preview', rank: 3, urgent: false, queuedAtMs: NOW },
        }),
      ],
      PLACES,
      NOW,
    );
    expect(msg.title).toBe('Heads-up: poor air quality and heat');
    expect(msg.body).toMatch(
      /^Office: air quality up to Very High \(9\) and heat index up to Danger \(41°C\) expected from about 1 pm to 6 pm tomorrow\./,
    );
  });

  it('says what a cancelled heads-up eased to, in the carer’s voice', () => {
    const [msg] = composeMessages(
      [
        event({
          placeId: 'mum',
          hazard: 'aqhi',
          stage: 'cancelled',
          toldRank: 2,
          toldStartMs: hkt(5, 14),
          cancelledPeakValue: 5,
          pending: { kind: 'cancelled', rank: 2, urgent: false, queuedAtMs: NOW },
        }),
      ],
      PLACES,
      NOW,
    );
    expect(msg.body).toBe(
      "Mum's home: air quality tomorrow now expected to peak at Moderate (5), below your alert level. No need to change their plans.",
    );
  });

  it('falls back to a plain cancellation for events stored before the peak was kept', () => {
    const [msg] = composeMessages(
      [event({ placeId: 'office', hazard: 'aqhi', stage: 'cancelled', toldRank: 3, pending: { kind: 'cancelled', rank: 3, urgent: false, queuedAtMs: NOW } })],
      PLACES,
      NOW,
    );
    expect(msg.body).toBe(
      'Office: the latest forecast stays below your alert level. No special plans needed.',
    );
  });

  it('tells a carer to pass on the all clear, and never guesses a level', () => {
    const [msg] = composeMessages(
      [event({ placeId: 'mum', hazard: 'aqhi', stage: 'cleared', toldRank: 2, pending: { kind: 'cleared', rank: 2, urgent: false, queuedAtMs: NOW } })],
      PLACES,
      NOW,
    );
    expect(msg.body).toBe(
      "Mum's home: back to below your alert level. Let them know they can go back to normal activities.",
    );
  });

  it('gives heat its own urgent advice at Extreme Danger', () => {
    const [msg] = composeMessages(
      [event({ placeId: 'office', hazard: 'heat', latestValue: 55, pending: { kind: 'breaking', rank: 4, urgent: true, queuedAtMs: NOW } })],
      PLACES,
      NOW,
    );
    expect(msg.body).toContain('Everyone should avoid outdoor activity');
  });

  it('gives older adults the stay-cool heat advice', () => {
    const [msg] = composeMessages(
      [event({ placeId: 'school', hazard: 'heat', latestValue: 35, pending: { kind: 'breaking', rank: 2, urgent: false, queuedAtMs: NOW } })],
      PLACES,
      NOW,
    );
    expect(msg.body).toContain('Stay somewhere cool or air-conditioned');
  });
});

describe('morning reminder', () => {
  const MORNING = hkt(5, 7, 30);
  const today = (startHour: number) =>
    event({
      placeId: 'office',
      hazard: 'aqhi',
      stage: 'forecast',
      toldRank: 3,
      forecast: { startMs: hkt(5, startHour), endMs: hkt(5, startHour + 4), minValue: 8, maxValue: 9, peakRank: 3 },
    });
  const digest = (ev: AlertEvent) =>
    composeDigest({ slot: 'morning', due: [], events: [ev], places: PLACES, nowMs: MORNING, noEventDays: 'silent' });

  it('says until when the day is still fine', () => {
    expect(digest(today(14))?.body).toMatch(
      /^Office: fine until about 2 pm, then Very High \(8-9\) until about 6 pm\./,
    );
  });

  it('skips "fine until" when the window starts soon', () => {
    expect(digest(today(8))?.body).toMatch(
      /^Office: expected Very High \(8-9\) from about 8 am to 12 pm today\./,
    );
  });
});

describe('push length', () => {
  // Realistic worst cases: three named places plus "N more", both hazards,
  // the longest advice. User-typed labels can be longer still.
  const many: Record<string, AlertPlace> = {
    ...PLACES,
    gym: place('gym', 'Gym'),
    park: place('park', 'Park'),
  };
  const ids = Object.keys(many);
  const pending = (kind: 'preview' | 'breaking' | 'cancelled' | 'cleared') => ({
    kind,
    rank: 3,
    urgent: false,
    queuedAtMs: NOW,
  });
  const forecastFor = (hazard: 'heat' | 'aqhi') =>
    hazard === 'aqhi'
      ? { startMs: hkt(5, 22), endMs: hkt(6, 3), minValue: 7, maxValue: 10, peakRank: 3 }
      : { startMs: hkt(5, 11), endMs: hkt(5, 18), minValue: 33, maxValue: 52, peakRank: 3 };
  const bothHazards = ['aqhi', 'heat'] as const;

  const scenarios: Record<string, AlertEvent[]> = {
    dualPreview: ids.flatMap(id =>
      bothHazards.map(hazard =>
        event({ placeId: id, hazard, stage: 'forecast', forecast: forecastFor(hazard), pending: pending('preview') }),
      ),
    ),
    dualLive: ids.flatMap(id =>
      bothHazards.map(hazard =>
        event({ placeId: id, hazard, latestValue: hazard === 'aqhi' ? 10 : 52, pending: pending('breaking') }),
      ),
    ),
    singleUpdate: ids.map(id =>
      event({ placeId: id, hazard: 'aqhi', stage: 'forecast', toldRank: 2, forecast: forecastFor('aqhi'), pending: { ...pending('preview'), kind: 'escalation' } }),
    ),
    cancelled: ids.map(id =>
      event({ placeId: id, hazard: 'aqhi', stage: 'cancelled', toldRank: 3, toldStartMs: hkt(5, 14), cancelledPeakValue: 6, pending: pending('cancelled') }),
    ),
    cleared: ids.flatMap(id =>
      bothHazards.map(hazard =>
        event({ placeId: id, hazard, stage: 'cleared', latestValue: hazard === 'aqhi' ? 6 : 31, toldRank: 3, pending: pending('cleared') }),
      ),
    ),
  };

  it.each(Object.entries(scenarios))('%s stays within the push budget', (_name, events) => {
    const messages = composeMessages(events, many, NOW);
    expect(messages).toHaveLength(1);
    expect(messages[0].body.length).toBeLessThanOrEqual(ALERT_MESSAGE_CONFIG.pushBodyMaxChars);
  });
});
