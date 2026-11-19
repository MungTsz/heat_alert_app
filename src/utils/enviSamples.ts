// src/utils/enviSamples.ts
import { DEFAULT_ALERT_PERSON, DEFAULT_PLACE_ALERT_PROFILE } from '../config/alertConfig';
import { ENVI_ACTION_COPY, ENVI_COPY, ENVI_FOR_YOU_COPY } from '../config/alertCopy';
import { AlertPerson } from '../types/alerts';
import { LocationContext, LocationContextSource } from '../types/envi';
import { HazardReadings, getEnviLevel, getEnviLevelInfo } from './enviUtils';
import { EnviAdviceFor, GENERAL_ADVICE_FOR, enviKeywordsFor } from './enviKeywords';
import { basedOnFor, forYouLineFor } from './enviForYou';
import { enviSummaryFor } from './enviSummary';
import { homeAdviceFor } from './homeAdvice';

// SAMPLE READINGS — for the development-only Environmental Index preview
// (App settings → "Preview Environmental Index") and the snapshot catalogue
// in __tests__/enviSamples.test.ts. Never used by Home or the alert engine:
// real screens only ever show API data, so nothing here can reach them.

export type EnviSample = {
  key: string;
  title: string;
  // What the situation shows off, for whoever is reviewing it.
  note: string;
  current: HazardReadings;
  // The dashed "Today's peak" arrow (todaysPeakLevel on Home).
  peakLevel: number | null;
  // Settles ties by season (AQHI December to May, heat June to November).
  nowMs: number;
  // A live alert's personalised advice, as homeAdviceFor gives it.
  liveAdvice: string | null;
  // Who the advice is for and where they are; the general advice unless set.
  advice: EnviAdviceFor;
  // Location tracking on? Off adds the sheet's one-line suggestion.
  trackingOn: boolean;
};

// Noon HKT mid-month, only so ties fall in the intended season.
const SUMMER = Date.UTC(2026, 7, 15, 4);
const WINTER = Date.UTC(2026, 0, 15, 4);

// Heat index (°C): 25 No Caution, 30 Caution, 35 Extreme Caution, 45 Danger,
// 55 Extreme Danger. AQHI: 2 Low, 5 Moderate, 7 High, 9 Very High, 11 Serious.
const sample = (
  key: string,
  title: string,
  note: string,
  current: HazardReadings,
  extra: Partial<Omit<EnviSample, 'key' | 'title' | 'note' | 'current'>> = {},
): EnviSample => ({
  key,
  title,
  note,
  current,
  peakLevel: extra.peakLevel ?? null,
  nowMs: extra.nowMs ?? SUMMER,
  liveAdvice: extra.liveAdvice ?? null,
  advice: extra.advice ?? GENERAL_ADVICE_FOR,
  trackingOn: extra.trackingOn ?? true,
});

// The phone's owner, as About you would answer, somewhere.
const forPerson = (
  person: Partial<AlertPerson>,
  context: LocationContext = 'unknown',
  source: LocationContextSource = context === 'unknown' ? 'none' : 'tracking',
): EnviAdviceFor => ({
  person: { ...DEFAULT_ALERT_PERSON, ...person },
  context,
  source,
});

const HEAT_DANGER = { heat: 45, aqhi: 2 };

export const ENVI_SAMPLES: EnviSample[] = [
  sample('calm', 'Calm day', 'Level 1: one calm tile, no "For you" line, no recommendations bar.', {
    heat: 25,
    aqhi: 2,
  }),
  sample('warm', 'Warm summer day', 'Heat is higher, so heat leads the line and tiles.', {
    heat: 30,
    aqhi: 2,
  }),
  sample(
    'tie-winter',
    'Level tie in winter',
    'Both at level 2: the season (AQHI December to May) decides who leads.',
    { heat: 30, aqhi: 5 },
    { nowMs: WINTER },
  ),
  sample('poor-air', 'Poor air, mild heat', 'AQHI Very High sets level 4.', { heat: 25, aqhi: 9 }),
  sample('heat-danger', 'Dangerous heat', 'Heat index Danger sets level 4.', {
    heat: 45,
    aqhi: 5,
  }),
  sample(
    'both-high',
    'Heat and poor air together',
    'Both at level 3 or above: both risks in the sheet, the fixed combined tiles.',
    { heat: 35, aqhi: 7 },
  ),
  sample('extreme-heat', 'Extreme heat', 'Level 5: black square with a thin outline.', {
    heat: 55,
    aqhi: 2,
  }),
  sample('serious-air', 'Serious air pollution', 'Level 5 from AQHI 10+.', {
    heat: 25,
    aqhi: 11,
  }),
  sample(
    'peak-next-door',
    "Today's peak, next level up",
    'Peak one level above now: the two labels push apart.',
    { heat: 30, aqhi: 2 },
    { peakLevel: 3 },
  ),
  sample(
    'peak-later',
    "Today's peak, later",
    'Peak two levels above now, later today.',
    { heat: 30, aqhi: 2 },
    { peakLevel: 4 },
  ),
  sample(
    'live-alert',
    'Live heat alert at your location',
    'Card unchanged; the alert’s own advice leads the recommendations sheet.',
    { heat: 45, aqhi: 2 },
    {
      liveAdvice: homeAdviceFor({
        liveAlerts: [{ hazard: 'heat', urgent: false }],
        aboutYou: DEFAULT_PLACE_ALERT_PROFILE,
      }),
    },
  ),
  sample(
    'heat-only',
    'Air quality unavailable',
    'No AQHI (e.g. PRAISE not set up): the index comes from heat alone.',
    { heat: 35, aqhi: null },
  ),
  sample('no-readings', 'Nothing available yet', 'Both missing: "--" square, faded band.', {
    heat: null,
    aqhi: null,
  }),

  // Where you are — the same dangerous heat, four places.
  sample(
    'where-indoors',
    'Dangerous heat, at a saved place',
    'Inside a saved place: things to do indoors, such as air-con.',
    HEAT_DANGER,
    { advice: forPerson({}, 'indoors') },
  ),
  sample(
    'where-outdoors',
    'Dangerous heat, outdoors',
    'Walking outside saved places for 15 minutes: shade, water, slow down — never air-con.',
    HEAT_DANGER,
    { advice: forPerson({}, 'outdoors') },
  ),
  sample(
    'where-transit',
    'Dangerous heat, on the move',
    'Vehicle speed: water for the trip, wait indoors.',
    HEAT_DANGER,
    { advice: forPerson({}, 'transit') },
  ),
  sample(
    'where-unknown',
    'Dangerous heat, tracking off',
    'Tracking off: the general advice, and one quiet line at the bottom of the sheet.',
    HEAT_DANGER,
    { trackingOn: false },
  ),
  sample(
    'where-usually-outdoors',
    'Hot, "Often outdoors", tracking off',
    'No tracking, but About you says often outdoors: the outdoor advice, worded as a habit.',
    { heat: 35, aqhi: 2 },
    {
      advice: forPerson({ dailyActivity: 'outdoors' }, 'outdoors', 'dailyActivity'),
      trackingOn: false,
    },
  ),
  sample(
    'where-corrected',
    'Corrected to indoors',
    'The user tapped "Indoors" for this stay: the indoor advice until they leave or midnight.',
    { heat: 35, aqhi: 2 },
    { advice: forPerson({}, 'indoors', 'override') },
  ),
  sample(
    'both-high-transit',
    'Heat and poor air, on the move',
    'The fixed combined set for a vehicle: air-con on, windows up.',
    { heat: 35, aqhi: 7 },
    { advice: forPerson({}, 'transit') },
  ),

  // Who you are.
  sample(
    'who-asthma',
    'Asthma, poor air',
    'AQHI High (level 3): "Carry inhaler" takes the free tile.',
    { heat: 25, aqhi: 7 },
    { nowMs: WINTER, advice: forPerson({ identities: ['asthma'] }) },
  ),
  sample(
    'who-heart-lung',
    'Heart or lung condition, hot',
    'Heat level 3: "Follow care plan" in place of the last tile.',
    { heat: 35, aqhi: 2 },
    { advice: forPerson({ identities: ['heartLung'] }) },
  ),
  sample(
    'who-pregnant',
    'Pregnant, warm, at home',
    'Heat level 2: "Rest often" joins the indoor tiles.',
    { heat: 30, aqhi: 2 },
    { advice: forPerson({ identities: ['pregnant'] }, 'indoors') },
  ),
  sample(
    'who-older',
    'Older adult, hot, outdoors',
    '"Drink before thirsty" says "Drink water" more precisely, in its place.',
    { heat: 35, aqhi: 2 },
    { advice: forPerson({ identities: ['older'] }, 'outdoors') },
  ),
  sample(
    'who-other-chronic',
    'Other long-term condition, poor air only',
    'Its tip is about heat only, so poor air alone gives the general advice.',
    { heat: 25, aqhi: 9 },
    { nowMs: WINTER, advice: forPerson({ identities: ['otherChronic'] }) },
  ),
  sample(
    'who-medicine',
    'Regular medicine, hot',
    'Heat level 3: "Keep medicine cool", and the sheet’s "ask your doctor or pharmacist" line.',
    { heat: 35, aqhi: 2 },
    { advice: forPerson({ takesRegularMedicine: true }) },
  ),
  sample(
    'who-several',
    'Several answers at once',
    'Older adult, asthma and medicine: the top tip on the card, the rest in the sheet.',
    HEAT_DANGER,
    {
      advice: forPerson(
        { identities: ['older', 'asthma'], takesRegularMedicine: true },
        'indoors',
      ),
    },
  ),
  sample(
    'go-indoors-heat',
    'Pregnant, outdoors, dangerous heat',
    'More at risk, outdoors, level 4+: "Go indoors soon" comes first.',
    HEAT_DANGER,
    { advice: forPerson({ identities: ['pregnant'] }, 'outdoors') },
  ),
  sample(
    'go-indoors-air',
    'Asthma, outdoors, very poor air',
    '"Go indoors soon" replaces the weaker "Head indoors sooner".',
    { heat: 25, aqhi: 9 },
    { nowMs: WINTER, advice: forPerson({ identities: ['asthma'] }, 'outdoors') },
  ),

  // Visiting a saved place someone else lives at: it only says where you
  // are. The advice is still yours — your answers, never theirs.
  sample(
    'at-mums-home',
    "You (asthma) at Mum's home",
    'Mum\'s home is a saved place, so you are indoors; the advice is for you and your asthma, not for Mum.',
    { heat: 35, aqhi: 7 },
    { advice: forPerson({ identities: ['asthma'] }, 'indoors') },
  ),
];

// One sample as plain text — what the card and the recommendations sheet
// would say. The snapshot of these is the readable catalogue to review
// wording changes in.
export const describeEnviSample = (s: EnviSample): string => {
  const level = getEnviLevel(s.current);
  const personal = level !== null && level > 1;
  const { warnings, actions, sheetActions, medicineNote } = enviKeywordsFor(
    s.current,
    s.nowMs,
    s.advice,
  );
  const lines = [
    `## ${s.title} (heat ${s.current.heat ?? '--'}, AQHI ${s.current.aqhi ?? '--'})`,
    `Index: ${level === null ? ENVI_COPY.unavailable : `${level} ${getEnviLevelInfo(level).name}`}${
      s.peakLevel !== null ? ` · today's peak ${s.peakLevel}` : ''
    }`,
    `Line: ${enviSummaryFor(s.current, s.nowMs) ?? '(none)'}`,
  ];
  if (personal) lines.push(forYouLineFor(s.advice));
  lines.push(
    `Tiles: ${actions.map(id => ENVI_ACTION_COPY[id].label).join(' · ') || '(none)'}`,
    `${ENVI_COPY.moreLink}: ${personal ? 'shown' : 'hidden'}`,
  );
  if (warnings.length > 0) lines.push(`Health risk: ${warnings.join(' / ')}`);
  if (personal) lines.push(basedOnFor(s.advice));
  if (s.liveAdvice) lines.push(`Alert advice: ${s.liveAdvice}`);
  sheetActions.forEach(id => lines.push(`- ${ENVI_ACTION_COPY[id].sentence}`));
  if (medicineNote) lines.push(ENVI_FOR_YOU_COPY.medicineNote);
  if (!s.trackingOn) lines.push(`Bottom: ${ENVI_FOR_YOU_COPY.trackingHint}`);
  return lines.join('\n');
};
