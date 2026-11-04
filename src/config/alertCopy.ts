// src/config/alertCopy.ts
import { AudienceGroup, CaringFor, HazardKind } from '../types/alerts';
import { AllClearMode } from '../types/settings';

// Every user-facing word about alerts lives here, so a Traditional Chinese
// version later is a copy of this file rather than a hunt through logic.
// Rules from the design doc: spell out "Air quality" / "Heat index" (no
// AQHI/HKHI in titles), lead with the action, say "expected" for forecasts,
// no exclamation marks or scare words, describe people objectively.

export const AUDIENCE_COPY: Record<AudienceGroup, { label: string }> = {
  general: { label: 'General adult' },
  sensitive: { label: 'Older adult, child or pregnant' },
  chronic: { label: 'Heart, lung or other long-term condition' },
  outdoor: { label: 'Outdoor work or exercise' },
};

export const CARING_FOR_COPY: Record<CaringFor, string> = {
  self: 'For myself',
  family: 'For family or others',
};

export const HAZARD_COPY: Record<HazardKind, { name: string; lower: string }> = {
  heat: { name: 'Heat index', lower: 'heat index' },
  aqhi: { name: 'Air quality', lower: 'air quality' },
};

export const ALL_CLEAR_COPY: Record<AllClearMode, string> = {
  auto: 'Auto',
  always: 'Always',
  off: 'Off',
};

export const PROFILE_EDITOR_COPY = {
  placeQuestion: "Who's usually here?",
  selfQuestion: 'Which best describes you?',
  pickMostCare: 'If several people are here, pick the one who needs the most care.',
  familyHint: 'Alerts will suggest calling them.',
  hazardsTitle: 'Alert me about',
  advancedTitle: 'Advanced',
  advancedHint: 'Change the alert level only if the default doesn’t suit you.',
  followAudience: 'Default',
  privacyNote: 'This stays on your phone and is never uploaded.',
  sheetTitle: 'Alert settings',
  audienceResult: (heatLevel: string, aqhiLevel: string) =>
    `Alerts at heat index ${heatLevel} · air quality ${aqhiLevel}`,
};

export const PLACE_ALERT_SUMMARY_COPY = {
  off: 'Alerts off',
  // e.g. "Older adult, child or pregnant · For family or others"
  summary: (audience: string, caringFor: string) => `${audience} · ${caringFor}`,
};

export const CURRENT_LOCATION_LABEL = 'Your location';

// Advice, keyed by voice: 'self' speaks to the reader, 'family' asks them
// to call the person they set the place up for.
type Voiced = Record<CaringFor, string>;

const AQHI_GENERAL_ADVICE: Voiced = {
  self: 'Cut down outdoor time and hard exercise, especially near busy roads.',
  family: 'Call to remind them to cut down outdoor time, especially near busy roads.',
};
const AQHI_SENSITIVE_ADVICE: Voiced = {
  self: 'Stay indoors where you can and cut down outdoor exertion.',
  family: 'Call to remind them to stay indoors and cut down outdoor exertion.',
};

export const AQHI_ADVICE: Record<AudienceGroup, Voiced> = {
  general: AQHI_GENERAL_ADVICE,
  sensitive: AQHI_SENSITIVE_ADVICE,
  chronic: AQHI_SENSITIVE_ADVICE,
  outdoor: {
    self: 'Cut down hard physical work outdoors and take more breaks.',
    family: 'Call to remind them to cut down hard outdoor work and take more breaks.',
  },
};

// EPD's "Serious" advice applies to everyone, whoever the place is for.
export const AQHI_URGENT_ADVICE: Voiced = {
  self: 'Everyone should cut down outdoor activity and exertion as much as possible.',
  family: 'Call to remind them to stay indoors and avoid exertion.',
};

const HEAT_GENERAL_ADVICE: Voiced = {
  self: 'Drink water, keep outdoor activity to early morning or evening, and watch for dizziness, headache or nausea.',
  family: 'Call to remind them to drink water and stay somewhere cool.',
};

export const HEAT_ADVICE: Record<AudienceGroup, Voiced> = {
  general: HEAT_GENERAL_ADVICE,
  sensitive: HEAT_GENERAL_ADVICE,
  chronic: HEAT_GENERAL_ADVICE,
  outdoor: {
    self: 'Rest in the shade, drink water often, and stop work at once if you feel unwell.',
    family: 'Call to remind them to rest in the shade and drink water often.',
  },
};

// Poor air and heat together. Not simply both lists of advice: HKO's "open
// windows and use a fan" would let polluted air in, so the combined advice
// is air-conditioning with windows shut. Risk of death is far higher when
// the two coincide (Rahman et al., 2022). Needs a public-health review.
export const DUAL_ADVICE: Voiced = {
  self: 'Stay indoors with air conditioning and windows closed, or go to a public cooling centre. Drink water.',
  family: 'Call to remind them to stay indoors with air conditioning and windows closed, and to drink water.',
};

const joinHazardNames = (hazards: readonly HazardKind[], capitalised: boolean) => {
  const names = hazards.map(h => HAZARD_COPY[h].lower);
  const text = names.join(' and ');
  return capitalised ? text.charAt(0).toUpperCase() + text.slice(1) : text;
};

// Message templates. `places` is already formatted ("Home, Office and
// School"); `level` texts look like "High (7)" or "Danger (41°C)"; `when`
// looks like "from about 2 pm tomorrow".
export const MESSAGE_COPY = {
  previewTitle: (hazard: HazardKind, level: string) =>
    `${HAZARD_COPY[hazard].name} heads-up: ${level}`,
  previewUpdateTitle: (hazard: HazardKind, level: string) =>
    `Updated heads-up: ${HAZARD_COPY[hazard].lower} ${level}`,
  previewBody: (places: string, range: string, when: string, advice: string) =>
    `${places}: expected ${range} ${when}. ${advice}`,

  dualPreviewTitle: 'Heads-up: poor air quality and heat',
  dualPreviewUpdateTitle: 'Updated heads-up: poor air quality and heat',
  dualPreviewBody: (places: string, when: string, advice: string) =>
    `${places}: poor air quality and a high heat index expected ${when}. ${advice}`,

  breakingTitle: (hazard: HazardKind, level: string) =>
    `${HAZARD_COPY[hazard].name} now ${level}`,
  breakingBody: (places: string, level: string, advice: string) =>
    `${places}: ${level} now. ${advice}`,
  escalationTitle: (hazard: HazardKind, level: string) =>
    `${HAZARD_COPY[hazard].name} up to ${level}`,
  escalationBody: (places: string, level: string, advice: string) =>
    `${places}: now ${level}, worse than the earlier alert. ${advice}`,

  dualLiveTitle: 'Poor air quality and heat now',
  dualLiveBody: (places: string, aqhiLevel: string, heatLevel: string, advice: string) =>
    `${places}: air quality ${aqhiLevel}, heat index ${heatLevel}. ${advice}`,

  cancelledTitle: (hazards: readonly HazardKind[]) =>
    `Heads-up cancelled: ${joinHazardNames(hazards, false)}`,
  cancelledBody: (places: string) =>
    `The latest forecast for ${places} stays below your alert level. No special plans needed.`,

  clearedTitle: (hazards: readonly HazardKind[]) =>
    `All clear: ${joinHazardNames(hazards, false)}`,
  clearedBody: (places: string, level: string) =>
    `${places}: back to ${level}. Normal activities can resume.`,
  dualClearedBody: (places: string) =>
    `${places}: air quality and heat index are back below your alert levels. Normal activities can resume.`,

  // "Preview a notification" in Settings — clearly marked, and with no
  // numbers in it, so a sample can never be mistaken for a real reading.
  samplePrefix: 'Sample · ',
};

export const TIME_COPY = {
  today: 'today',
  tomorrow: 'tomorrow',
  from: (clock: string, day: string) => `from about ${clock} ${day}`,
  onWeekday: (weekday: string) => `on ${weekday}`,
  weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  am: 'am',
  pm: 'pm',
};

export const PLACE_LIST_COPY = {
  and: ' and ',
  more: (count: number) => `${count} more ${count === 1 ? 'place' : 'places'}`,
};
