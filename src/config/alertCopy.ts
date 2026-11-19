// src/config/alertCopy.ts
import {
  AdviceGroup,
  CaringFor,
  DailyActivity,
  HazardKind,
  IdentityGroup,
} from '../types/alerts';
import { AllClearMode, NoEventDays } from '../types/settings';
import { EnviActionId } from '../types/envi';
import { MapLayer } from '../types/mapSettings';

// Every user-facing word about alerts lives here, so a Traditional Chinese
// version later is a copy of this file rather than a hunt through logic.
// Rules from the design doc: spell out "Air quality" / "Heat index" (no
// AQHI/HKHI in titles), lead with the action, say "expected" for forecasts,
// no exclamation marks or scare words, describe people objectively.

// `label` is also what summaries show ("Older adult (65+), Asthma"), so it
// stands on its own; `hint` is the smaller line under it in the picker.
export const IDENTITY_COPY: Record<IdentityGroup, { label: string; hint?: string }> = {
  general: { label: 'General adult' },
  older: { label: 'Older adult (65+)' },
  pregnant: { label: 'Pregnant' },
  asthma: { label: 'Asthma' },
  heartLung: { label: 'Heart or other lung condition' },
  otherChronic: { label: 'Other long-term condition', hint: 'e.g. kidney disease, diabetes' },
  child: { label: 'Child' },
};

export const DAILY_ACTIVITY_COPY: Record<DailyActivity, { label: string; hint?: string }> = {
  indoors: { label: 'Mostly indoors' },
  outdoors: { label: 'Often outdoors', hint: 'e.g. outdoor work, deliveries' },
};

// The three questions, asked of the phone's owner (About you) or about the
// people at a place. The medicine question never asks for a name: the app
// doesn't judge medicines.
export const PERSON_QUESTION_COPY = {
  self: {
    identities: 'Who are you?',
    identitiesHint: 'Select all that apply.',
    medicine: 'Do you take regular medicine?',
    medicineHint: 'For example for your heart, blood pressure, mental health or allergies.',
    activity: 'Where do you spend most of your day?',
  },
  place: {
    identities: "Who's usually here?",
    identitiesHint: 'If several people are here, select all that apply.',
    medicine: 'Does anyone here take regular medicine?',
    medicineHint: 'For example for the heart, blood pressure, mental health or allergies.',
    activity: 'Where do they spend most of their day?',
  },
  yes: 'Yes',
  no: 'No',
};

export const PERSON_SUMMARY_COPY = {
  identitySeparator: ', ',
  partSeparator: ' · ',
  medicine: 'Regular medicine',
};

export const CARING_FOR_COPY: Record<CaringFor, string> = {
  self: 'For myself',
  family: 'For family or others',
};

export const HAZARD_COPY: Record<HazardKind, { name: string; lower: string }> = {
  heat: { name: 'Heat index', lower: 'heat index' },
  aqhi: { name: 'Air quality', lower: 'air quality' },
};

export const DELIVERY_SETTINGS_COPY = {
  eveningLabel: 'Evening heads-up',
  eveningDescription: "Tomorrow's outlook, after the afternoon forecast update",
  morningLabel: 'Morning reminder',
  morningDescription: 'Only on days with something to know',
  timeLabel: 'Time',
  breakingLabel: 'Breaking updates',
  breakingDescription:
    'Send right away when it gets worse than expected. Off: wait for the next heads-up or reminder.',
  noEventLabel: 'Days with no alerts',
  noEventDescription: 'A morning summary, or nothing at all',
  noEventOptions: { silent: 'Nothing', summary: 'Morning summary' } as Record<NoEventDays, string>,
};

export const ALL_CLEAR_COPY: Record<AllClearMode, string> = {
  auto: 'Auto',
  always: 'Always',
  off: 'Off',
};

export const PROFILE_EDITOR_COPY = {
  placeForQuestion: 'Who is this place for?',
  // Under the About you answers a place for yourself uses, until changed.
  ownAudienceHint: 'Your answers in About you',
  // Heading over a place for yourself's own answers (with a Reset link).
  ownAnswersTitle: 'Answers for this place',
  change: 'Change',
  familyHint: 'Alerts will suggest calling them.',
  hazardsTitle: 'Alert me about',
  advancedTitle: 'Advanced',
  advancedHint: 'The level each alert starts at. Change it only if the suggested one doesn’t suit you.',
  // Shown beside a hazard only once its level has been changed.
  reset: 'Reset',
  privacyNote: 'This stays on your phone and is never uploaded.',
  sheetTitle: 'Alert settings',
  save: 'Save',
  cancel: 'Cancel',
  // Under the questions: what the answers add up to, shown as they're
  // given, so people start learning the levels before any alert arrives.
  levelsResult: (heatLevel: string, aqhiLevel: string) =>
    `Alerts at heat index ${heatLevel} · air quality ${aqhiLevel}`,
};

// The Alerts tab: two summary rows (what is happening now, what was sent)
// that open their lists in a sheet, then how alerts reach you. Real app
// settings sit behind the header's gear.
export const ALERTS_SCREEN_COPY = {
  title: 'Alerts',
  sectionTitle: 'YOUR ALERTS',
  activeLabel: 'Active now',
  activeEmpty: 'No active alerts',
  // e.g. "Heat index · Your location and 2 more"
  activeSummary: (first: string, more: number) => (more > 0 ? `${first} and ${more} more` : first),
  recentLabel: 'Recent alerts',
  // The message log keeps a few days (ALERT_MESSAGE_LOG_CONFIG), so say how
  // far back the list goes rather than implying it is the full history.
  recentSummary: (count: number, days: number) =>
    `${count} sent in the last ${days} ${days === 1 ? 'day' : 'days'}`,
  recentEmpty: (days: number) => `Nothing sent in the last ${days} ${days === 1 ? 'day' : 'days'}`,
  urgent: 'Urgent',
  appSettingsLabel: 'App settings',
  appSettingsTitle: 'Settings',
};

export const NOTIFICATION_SOURCES_COPY = {
  title: 'NOTIFICATION SOURCES',
  subtitle: 'Choose where alerts are triggered from',
  currentLabel: 'Current Location',
  currentDescription: 'Alert me based on my live location',
  placesLabel: 'My Places',
  placesDescription: 'Alert me about my places, using who is there',
};

// Home's banner over the sky, for alerts at your own location. Each hazard
// reads like its card badge ("Heat index: Alert now"), joined into one line.
export const HOME_ALERT_COPY = {
  separator: ' · ',
  accessibilityHint: 'Opens the alert details',
};

// The Alerts tab's "About you" row and the sheet it opens.
export const ABOUT_YOU_COPY = {
  sectionTitle: 'ABOUT YOU',
  sectionSubtitle: 'Sets when alerts for your current location reach you',
  sheetTitle: 'About you',
};

// The three questions asked on first launch. Who the phone's owner is
// rarely changes, so they are asked once up front instead of sitting open in
// the Alerts tab. Every question has an answer filled in already, so each
// can be skipped by leaving it as it is.
export const ONBOARDING_COPY = {
  eyebrow: 'WELCOME',
  title: 'Alerts that fit you',
  intro:
    'Heat and air quality affect people differently. Answer three quick questions and we’ll alert you at the right level. Skip any you’d rather not answer.',
  laterHint: 'You can change this any time in Alerts.',
  continue: 'Continue',
  // Shown once instead, to people whose earlier one-choice answer had to
  // be converted with a guess (see profileMigration).
  reviewEyebrow: 'UPDATED',
  reviewTitle: 'Please check your details',
  reviewIntro:
    'We now ask a little more, so alerts can fit you better. We’ve filled this in from your earlier answer — change anything that isn’t right.',
  reviewContinue: 'Confirm',
};

// The one-line summary of a profile's levels, e.g. "Heat index Danger ·
// Air quality Very High" (or "Heat index off" for a switched-off hazard).
export const LEVEL_SUMMARY_COPY = {
  level: (hazardName: string, level: string) => `${hazardName} ${level}`,
  off: (hazardName: string) => `${hazardName} off`,
  separator: ' · ',
  allOff: 'Alerts off',
};

export const PLACE_ALERT_SUMMARY_COPY = {
  off: 'Alerts off',
  // e.g. "Older adult (65+), Asthma · For family or others"
  summary: (identities: string, caringFor: string) => `${identities} · ${caringFor}`,
  // A place whose old one-choice answer was converted with a guess, until
  // its alert sheet is saved.
  needsReview: 'Please check who is here',
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

// Keyed by AdviceGroup (adviceGroupFor picks it from the answers).
export const AQHI_ADVICE: Record<AdviceGroup, Voiced> = {
  general: AQHI_GENERAL_ADVICE,
  sensitive: AQHI_SENSITIVE_ADVICE,
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

// HKO singles out older adults, young children, pregnant women and people
// with chronic illness: for them it's staying somewhere cool, not only
// pacing outdoor activity.
const HEAT_SENSITIVE_ADVICE: Voiced = {
  self: 'Stay somewhere cool or air-conditioned, drink water, and avoid going out in the hottest hours.',
  family: 'Call to remind them to stay somewhere cool, drink water and avoid the hottest hours.',
};

export const HEAT_ADVICE: Record<AdviceGroup, Voiced> = {
  general: HEAT_GENERAL_ADVICE,
  sensitive: HEAT_SENSITIVE_ADVICE,
  outdoor: {
    self: 'Rest in the shade, drink water often, and stop work at once if you feel unwell.',
    family: 'Call to remind them to rest in the shade and drink water often.',
  },
};

// Heat's peer of AQHI_URGENT_ADVICE, at Extreme Danger: past the point
// where pacing yourself is enough, whoever the place is for.
export const HEAT_URGENT_ADVICE: Voiced = {
  self: 'Everyone should avoid outdoor activity, stay somewhere cool and drink water.',
  family: 'Call to check on them now and make sure they are somewhere cool.',
};

// Home's Environmental Index card and the sheet it opens. Users only ever
// see "Environmental Index", never the code name ENVI. The explainer says
// what it is, not how it is worked out — that stays out of the UI on
// purpose.
export const ENVI_COPY = {
  title: 'Environmental Index',
  explainer:
    'Your overall outdoor risk from heat and air quality, from 1 (low) to 5 (serious).',
  unavailable: '--',
  // The card's bottom bar, which opens the recommendations sheet.
  moreLink: 'Detailed recommendations',
  // Above the band's two arrows.
  nowMarker: 'Now',
  peakMarker: "Today's peak",
  // Sheet titles: tapping the index opens its forecast; the bottom bar
  // opens the recommendations.
  forecastTitle: 'Forecast',
  recommendationsTitle: 'Recommendations',
  // Recommendations sheet sections.
  meaningHeading: 'What it means',
  riskHeading: 'Health risk',
  adviceHeading: 'Recommended actions',
  linksHeading: 'Official guidance',
  // Screen-reader wording for the card: "Environmental Index 3, High".
  levelLabel: (level: number, name: string) => `Environmental Index ${level}, ${name}`,
  unavailableLabel: 'Environmental Index not available',
  forecastHint: 'Opens the forecast',
  detailsHint: 'Opens detailed recommendations',
};

// The one plain-language line under the level: how heat and air feel right
// now, e.g. "Air quality is good, but it's very hot." Keyed by each
// hazard's own level name, so it can never disagree with the level tables.
// Heat's lowest level is "not too hot" rather than "comfortable": in winter
// a heat index under 27°C can be cold.
export const ENVI_SUMMARY_COPY = {
  heat: {
    'No Caution': "it's not too hot",
    Caution: "it's warm",
    'Extreme Caution': "it's hot",
    Danger: "it's very hot",
    'Extreme Danger': "it's dangerously hot",
  } as Record<string, string>,
  aqhi: {
    Low: 'air quality is good',
    Moderate: 'air quality is fair',
    High: 'air quality is poor',
    'Very High': 'air quality is very poor',
    Serious: 'air quality is hazardous',
  } as Record<string, string>,
  // The concern goes last, after "but" when the other hazard is fine.
  contrast: (fine: string, concern: string) => `${fine}, but ${concern}.`,
  both: (first: string, second: string) => `${first} and ${second}.`,
  single: (phrase: string) => `${phrase}.`,
};

// The warning chip on the Environmental Index card: the risk in a few
// words, keyed by each hazard's own level name. The lowest level has no
// entry (no chip at Environmental Index 1). Health wording: needs a
// public-health review before release.
export const ENVI_WARNING_COPY: Record<HazardKind, Record<string, string>> = {
  heat: {
    Caution: 'Tiredness possible',
    'Extreme Caution': 'Heat exhaustion possible',
    Danger: 'Heat stroke possible',
    'Extreme Danger': 'Heat stroke likely',
  },
  aqhi: {
    Moderate: 'Mild risk',
    High: 'Risk for sensitive groups',
    'Very High': 'Risk for everyone',
    Serious: 'Serious risk',
  },
};

// Each action keyword: `label` under its icon on the card (at most
// ENVI_KEYWORD_LIMITS.maxTileWords words, held there by tests), `sentence` as the detail sheet's full advice. Which
// actions show at which level is in config/enviKeywords.ts. Health advice:
// needs a public-health review before release.
export const ENVI_ACTION_COPY: Record<EnviActionId, { label: string; sentence: string }> = {
  drinkWater: { label: 'Drink water', sentence: 'Drink water regularly, before you feel thirsty.' },
  restInShade: {
    label: 'Rest in shade',
    sentence: "Take breaks in the shade if you're active outdoors.",
  },
  avoidMidday: {
    label: 'Avoid midday',
    sentence: 'Keep outdoor activity to early morning or evening, away from the hottest hours.',
  },
  stayCool: { label: 'Stay cool', sentence: 'Stay somewhere cool, such as an air-conditioned room.' },
  airConOn: { label: 'Air-con on', sentence: 'Use air conditioning to keep cool indoors.' },
  stayIndoors: { label: 'Stay indoors', sentence: 'Stay indoors as much as you can.' },
  lessExertion: { label: 'Less exertion', sentence: 'Cut down on strenuous activity outdoors.' },
  avoidExertion: { label: 'Avoid exertion', sentence: 'Avoid strenuous activity, indoors or out.' },
  avoidBusyRoads: {
    label: 'Avoid busy roads',
    sentence: 'Keep away from busy roads, where traffic pollution is highest.',
  },
  lessTimeOutside: { label: 'Less time outside', sentence: 'Cut down the time you spend outdoors.' },
  watchSymptoms: {
    label: 'Watch symptoms',
    sentence: 'If you have a heart or lung condition, ease off outdoors when you notice symptoms.',
  },
  windowsClosed: { label: 'Windows closed', sentence: 'Keep windows closed to keep polluted air out.' },
  enjoyOutdoors: { label: 'Enjoy outdoors', sentence: 'A good time to be outdoors.' },
};

// Labels of Home's side bar blocks — full words, never "Air" or "RH".
export const HOME_INFO_BAR_COPY = {
  heat: 'Heat index',
  aqhi: 'AQHI',
  temperature: 'Temp',
  humidity: 'Humidity',
  unavailable: '--',
  expandLabel: 'Show current readings',
  collapseLabel: 'Hide current readings',
  // Screen reader: "Heat index 34°, opens the forecast".
  blockHint: 'Opens the forecast',
};

// The map: layer picker, return chip, tapped-point card and controls. The
// layer names are the same words as Home's card and side bar.
export const MAP_LAYER_COPY = {
  layerNames: {
    envi: ENVI_COPY.title,
    heat: HOME_INFO_BAR_COPY.heat,
    aqhi: HOME_INFO_BAR_COPY.aqhi,
  } as Record<MapLayer, string>,
  // Picker group holding the two hazard layers.
  detailsGroup: 'View details',
  // Under a layer with no data source (AQHI without PRAISE).
  noData: 'Not available right now',
  // "Heat index · ← Environmental Index"
  returnChip: (layerName: string) => `${layerName} · ← ${ENVI_COPY.title}`,
  // Tapped point's card on the index layer.
  pointDetails: 'Details',
  pointHideDetails: 'Hide details',
  opacityLabel: (percent: number) => `Layer opacity: ${percent}%`,
  playForecast: 'Play Forecast',
  loadingForecast: 'Loading forecast…',
  stopForecast: 'Stop',
  // Screen-reader labels of the map's buttons.
  pickerButtonLabel: 'Choose map layer',
  layerOptionLabel: (layerName: string) => `Show ${layerName} on the map`,
  returnChipLabel: `Back to ${ENVI_COPY.title}`,
  pointDetailsLabel: 'Show heat index, AQHI, temperature and humidity here',
  pointHideDetailsLabel: 'Hide heat index, AQHI, temperature and humidity',
  pointLevelLabel: (level: number, name: string) => `${ENVI_COPY.title} here: ${level}, ${name}`,
  pointUnavailableLabel: `${ENVI_COPY.title} here: not available`,
  openFullscreenLabel: 'Open the full-screen map',
  locateLabel: 'Go to my location',
  playForecastLabel: 'Play the forecast on the map',
  stopForecastLabel: 'Stop the forecast',
  closeMapLabel: 'Close the map',
};

// The closing line of a cancelled heads-up and an all clear. A carer has
// to pass the news on, so their version says so.
export const CANCELLED_CLOSING: Voiced = {
  self: 'No special plans needed.',
  family: 'No need to change their plans.',
};
export const CLEARED_CLOSING: Voiced = {
  self: 'Normal activities can resume.',
  family: 'Let them know they can go back to normal activities.',
};

// Poor air and heat together. Not simply both lists of advice: HKO's "open
// windows and use a fan" would let polluted air in, so the combined advice
// is air-conditioning with windows shut. Risk of death is far higher when
// the two coincide (Rahman et al., 2022). Needs a public-health review.
export const DUAL_ADVICE: Voiced = {
  self: 'Stay indoors with air conditioning and windows closed, or go to a cooling centre. Drink water.',
  family: 'Call to remind them to stay indoors with air conditioning and windows closed, and to drink water.',
};

const joinHazardNames = (hazards: readonly HazardKind[], capitalised: boolean) => {
  const names = hazards.map(h => HAZARD_COPY[h].lower);
  const text = names.join(' and ');
  return capitalised ? text.charAt(0).toUpperCase() + text.slice(1) : text;
};

// Message templates. Each body here is the facts only (what, where, when);
// the composer appends the one action sentence, so a digest merging
// several parts still ends with a single action. `places` is already
// formatted ("Home, Office and School"); `level` texts look like "High (7)"
// or "Danger (41°C)"; `peak` texts like "up to Very High (10)"; `when` like
// "from about 2 pm to 6 pm tomorrow".
export const MESSAGE_COPY = {
  previewTitle: (hazard: HazardKind, level: string) =>
    `${HAZARD_COPY[hazard].name} heads-up: ${level}`,
  previewUpdateTitle: (hazard: HazardKind, level: string) =>
    `Updated heads-up: ${HAZARD_COPY[hazard].lower} ${level}`,
  previewBody: (places: string, range: string, when: string) =>
    `${places}: expected ${range} ${when}.`,
  // An update says what changed, so it doesn't read as a repeat.
  previewUpdateBody: (places: string, range: string, when: string, change: string) =>
    `${places}: now expected ${range} ${when}, ${change}.`,
  updateWorse: 'worse than the last heads-up',
  updateEarlier: 'earlier than the last heads-up',

  dualPreviewTitle: 'Heads-up: poor air quality and heat',
  dualPreviewUpdateTitle: 'Updated heads-up: poor air quality and heat',
  dualPreviewBody: (places: string, aqhiPeak: string, heatPeak: string, when: string) =>
    `${places}: air quality ${aqhiPeak} and heat index ${heatPeak} expected ${when}.`,

  breakingTitle: (hazard: HazardKind, level: string) =>
    `${HAZARD_COPY[hazard].name} now ${level}`,
  breakingBody: (places: string, level: string) => `${places}: ${level} now.`,
  escalationTitle: (hazard: HazardKind, level: string) =>
    `${HAZARD_COPY[hazard].name} up to ${level}`,
  escalationBody: (places: string, level: string) =>
    `${places}: now ${level}, worse than the earlier alert.`,

  dualLiveTitle: 'Poor air quality and heat now',
  dualLiveBody: (places: string, aqhiLevel: string, heatLevel: string) =>
    `${places}: air quality ${aqhiLevel}, heat index ${heatLevel}.`,

  cancelledTitle: (hazards: readonly HazardKind[]) =>
    `Heads-up cancelled: ${joinHazardNames(hazards, false)}`,
  // Names the new outlook, so a cancellation is believable rather than a
  // bare "never mind" (design doc: "回落至「中」").
  cancelledBody: (places: string, hazard: HazardKind, day: string, peak: string) =>
    `${places}: ${HAZARD_COPY[hazard].lower} ${day} now expected to peak at ${peak}, below your alert level.`,
  cancelledGenericBody: (places: string) =>
    `${places}: the latest forecast stays below your alert level.`,

  clearedTitle: (hazards: readonly HazardKind[]) =>
    `All clear: ${joinHazardNames(hazards, false)}`,
  clearedBody: (places: string, level: string) => `${places}: back to ${level}.`,
  dualClearedBody: (places: string, aqhiLevel: string, heatLevel: string) =>
    `${places}: air quality back to ${aqhiLevel}, heat index back to ${heatLevel}.`,
  // Stands in for a level when the latest reading is unavailable.
  belowAlertLevel: 'below your alert level',
  // A forecast's worst point: "up to Very High (10)".
  upTo: (level: string) => `up to ${level}`,

  // "Preview a notification" in the Alerts tab — clearly marked, and with no
  // numbers in it, so a sample can never be mistaken for a real reading.
  samplePrefix: 'Sample · ',
  sampleBody: (place: string, when: string) =>
    `${place}: poor air quality and a high heat index expected ${when}.`,
};

// The morning reminder about today (design doc: "今日提醒"), and the
// optional summary on days with nothing to report.
export const REMINDER_COPY = {
  title: (hazard: HazardKind, level: string) => `Today: ${HAZARD_COPY[hazard].lower} ${level}`,
  dualTitle: 'Today: poor air quality and heat',
  forecastBody: (places: string, range: string, when: string) =>
    `${places}: expected ${range} ${when}.`,
  // Design doc: "上午可正常外出，下午避免戶外運動" — say until when it is
  // still fine, not only when it isn't, so the morning can be planned.
  fineUntilBody: (places: string, startClock: string, range: string, endClock: string) =>
    `${places}: fine until about ${startClock}, then ${range} until about ${endClock}.`,
  ongoingBody: (places: string, level: string, day: number) =>
    day > 1 ? `${places}: ${level}, day ${day}.` : `${places}: ${level} now.`,
  dualBody: (places: string, aqhiLevel: string, heatLevel: string) =>
    `${places}: air quality ${aqhiLevel} and heat index ${heatLevel} today.`,
  noEventsTitle: 'No alerts today',
  noEventsBody: 'No heat or air quality alerts are expected today at your places.',
};

// Small badges on Home's hazard cards and Places' place cards (also the
// wording of Home's alert banner and the Alerts tab's active list).
export const ACTIVE_ALERT_BADGE_COPY = {
  now: 'Alert now',
  headsUp: (when: string) => `Heads-up ${when}`,
  // Place cards name the hazard, since one card shows both.
  withHazard: (hazard: HazardKind, text: string) => `${HAZARD_COPY[hazard].name}: ${text}`,
};

// The alert detail sheet (opened by tapping a notification or a badge).
export const DETAIL_COPY = {
  sheetTitle: 'Alert details',
  sentAt: (clock: string, day: string) => `Sent ${clock} ${day}`,
  missing: 'This alert is no longer available.',
  placesHeading: 'Places',
  meaningHeading: 'What this level means',
  adviceHeading: 'What to do',
  forecastHeading: (place: string) => `Forecast for ${place}`,
  sourcesHeading: 'Sources',
  sources:
    'Readings: PRAISE-HK (air quality) and the Spatial Temperature API (heat index), both from HKUST. Advice follows EPD and HKO health guidance.',
  disclaimer:
    'This app does not replace official warnings from the Hong Kong Observatory or the Environmental Protection Department.',
  helpfulQuestion: 'Was this alert helpful?',
  yes: 'Yes',
  no: 'No',
  thanks: 'Thanks — this helps tune future alerts.',
  itemNow: (level: string) => `${level} now`,
  itemExpected: (range: string, when: string) => `Expected ${range} ${when}`,
  itemCleared: (level: string) => `Back to ${level}`,
  itemClearedUnknown: 'Back below your alert level',
  itemCancelled: 'Heads-up cancelled',
};

// Official pages for the full advice.
export const OFFICIAL_LINKS: { label: string; url: string }[] = [
  { label: 'EPD: Air Quality Health Index', url: 'https://www.aqhi.gov.hk' },
  { label: 'HKO: Hot weather advice', url: 'https://www.hko.gov.hk/en/wservice/warning/coldhot.htm' },
];

// Three sentences at most, per the design doc's "learn the levels by
// using the app". AQHI wording follows EPD's health advice by risk band;
// heat uses the NWS risk text already in HEAT_INDEX_ZONES, so it isn't
// repeated here.
export const AQHI_LEVEL_MEANING: Record<string, string> = {
  Low: 'Low health risk. Normal activities are fine.',
  Moderate:
    'Moderate health risk. People with heart or lung conditions may notice symptoms and should take care outdoors.',
  High: 'High health risk. Children, older adults and people with heart or lung conditions should reduce outdoor exertion.',
  'Very High':
    'Very high health risk. Everyone should reduce outdoor exertion and time outdoors, especially near busy roads.',
  Serious:
    'Serious health risk. Everyone should reduce outdoor activity and exertion as much as possible.',
};

export const TIME_COPY = {
  today: 'today',
  tomorrow: 'tomorrow',
  yesterday: 'yesterday',
  midnight: 'midnight',
  from: (clock: string, day: string) => `from about ${clock} ${day}`,
  // "from about 2 pm to 6 pm tomorrow"
  window: (startClock: string, endClock: string, day: string) =>
    `from about ${startClock} to ${endClock} ${day}`,
  // "from about 10 pm today to 3 am tomorrow"
  windowAcrossDays: (startClock: string, startDay: string, endClock: string, endDay: string) =>
    `from about ${startClock} ${startDay} to ${endClock} ${endDay}`,
  onWeekday: (weekday: string) => `on ${weekday}`,
  weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  am: 'am',
  pm: 'pm',
};

export const PLACE_LIST_COPY = {
  and: ' and ',
  more: (count: number) => `${count} more ${count === 1 ? 'place' : 'places'}`,
};
