// src/utils/enviSamples.ts
import { DEFAULT_PLACE_ALERT_PROFILE } from '../config/alertConfig';
import { ENVI_ACTION_COPY, ENVI_COPY } from '../config/alertCopy';
import { HazardReadings, getEnviLevel, getEnviLevelInfo } from './enviUtils';
import { enviKeywordsFor } from './enviKeywords';
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
  // The dashed "Today's peak" arrow. Real screens hide it until the heat
  // API has a real forecast; the preview shows what it will look like.
  peakLevel: number | null;
  // Settles ties by season (AQHI December to May, heat June to November).
  nowMs: number;
  // A live alert's personalised advice, as homeAdviceFor gives it.
  liveAdvice: string | null;
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
  extra: Partial<Pick<EnviSample, 'peakLevel' | 'nowMs' | 'liveAdvice'>> = {},
): EnviSample => ({
  key,
  title,
  note,
  current,
  peakLevel: extra.peakLevel ?? null,
  nowMs: extra.nowMs ?? SUMMER,
  liveAdvice: extra.liveAdvice ?? null,
});

export const ENVI_SAMPLES: EnviSample[] = [
  sample('calm', 'Calm day', 'Level 1: one calm tile, no recommendations bar.', {
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
    'Peak two levels above now. Hidden on Home until the heat API has a real forecast.',
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
];

// One sample as plain text — what the card and the recommendations sheet
// would say. The snapshot of these is the readable catalogue to review
// wording changes in.
export const describeEnviSample = (s: EnviSample): string => {
  const level = getEnviLevel(s.current);
  const { warnings, actions } = enviKeywordsFor(s.current, s.nowMs);
  const lines = [
    `## ${s.title} (heat ${s.current.heat ?? '--'}, AQHI ${s.current.aqhi ?? '--'})`,
    `Index: ${level === null ? ENVI_COPY.unavailable : `${level} ${getEnviLevelInfo(level).name}`}${
      s.peakLevel !== null ? ` · today's peak ${s.peakLevel}` : ''
    }`,
    `Line: ${enviSummaryFor(s.current, s.nowMs) ?? '(none)'}`,
    `Tiles: ${actions.map(id => ENVI_ACTION_COPY[id].label).join(' · ') || '(none)'}`,
    `${ENVI_COPY.moreLink}: ${level !== null && level > 1 ? 'shown' : 'hidden'}`,
  ];
  if (warnings.length > 0) lines.push(`Health risk: ${warnings.join(' / ')}`);
  if (s.liveAdvice) lines.push(`For you: ${s.liveAdvice}`);
  actions.forEach(id => lines.push(`- ${ENVI_ACTION_COPY[id].sentence}`));
  return lines.join('\n');
};
