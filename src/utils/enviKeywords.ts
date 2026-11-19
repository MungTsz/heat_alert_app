// src/utils/enviKeywords.ts
import { DEFAULT_ALERT_PERSON, HAZARD_KINDS } from '../config/alertConfig';
import { ENVI_WARNING_COPY } from '../config/alertCopy';
import { ENVI_CONFIG } from '../config/enviConfig';
import {
  ENVI_CALM_ACTIONS,
  ENVI_DUAL_ACTIONS,
  ENVI_ESCALATION,
  ENVI_HAZARD_ACTIONS,
  ENVI_KEYWORD_LIMITS,
  ENVI_MEDICINE_NOTE_MIN_HEAT_LEVEL,
  ENVI_PERSON_TIPS,
  EnviPersonTip,
} from '../config/enviKeywords';
import { AlertPerson, HazardKind } from '../types/alerts';
import { EnviActionId, LocationContext, LocationContextSource } from '../types/envi';
import { levelOf } from './hazardLevels';
import { HazardReadings, getEnviLevel, hazardLevelOf, leadHazard } from './enviUtils';

// The phone's owner — always: the card advises the person holding the
// phone, from their About you answers and where they are right now. A saved
// place only says where they are (at Mum's home = indoors); it never makes
// the card advise the people who live there. The index itself never
// depends on any of this — only the words around it do.
export type EnviAdviceFor = {
  person: AlertPerson;
  context: LocationContext;
  // Where the context came from — only changes how it is worded.
  source: LocationContextSource;
};

// Nobody in particular, nowhere in particular: the general advice.
export const GENERAL_ADVICE_FOR: EnviAdviceFor = {
  person: DEFAULT_ALERT_PERSON,
  context: 'unknown',
  source: 'none',
};

export type EnviKeywords = {
  // Warning chips, in order (two only when both hazards are high).
  warnings: string[];
  // Action tiles, at most ENVI_KEYWORD_LIMITS.maxTiles.
  actions: EnviActionId[];
  // Every sentence of the recommendations sheet, in order: the card's tiles
  // (each said the person's way where one of their tips refines it), then
  // the rest of their tips in priority order. Never one thing twice.
  sheetActions: EnviActionId[];
  // Regular medicine: the sheet's "ask your doctor or pharmacist" line.
  medicineNote: boolean;
};

type HazardLevels = Record<HazardKind, number | null>;

const levelsOf = (current: HazardReadings): HazardLevels => ({
  heat: hazardLevelOf('heat', current.heat),
  aqhi: hazardLevelOf('aqhi', current.aqhi),
});

// Do heat and poor air both reach the level that calls for the combined
// advice?
const isHigh = (levels: HazardLevels) =>
  HAZARD_KINDS.every(hazard => (levels[hazard] ?? 0) >= ENVI_CONFIG.dualAdviceMinLevel);

const tipApplies = (tip: EnviPersonTip, person: AlertPerson, levels: HazardLevels): boolean => {
  const isFor =
    tip.audience === 'medicine'
      ? person.takesRegularMedicine
      : person.identities.includes(tip.audience);
  const reached = (Object.keys(tip.minLevel) as HazardKind[]).some(
    hazard => (levels[hazard] ?? 0) >= (tip.minLevel[hazard] as number),
  );
  return isFor && reached;
};

// Every tip for this person at these levels, in priority order, each
// action once (heart / lung and other long-term conditions share one).
const personTipsFor = (person: AlertPerson, levels: HazardLevels): EnviPersonTip[] =>
  ENVI_PERSON_TIPS.filter(tip => tipApplies(tip, person, levels)).filter(
    (tip, i, tips) => tips.findIndex(other => other.action === tip.action) === i,
  );

// Anyone the conditions are harder on than a general adult.
const isMoreAtRisk = (person: AlertPerson): boolean =>
  person.takesRegularMedicine || person.identities.some(identity => identity !== 'general');

// "Go indoors soon" as the first tile — unless the set already says it as
// strongly or more ("Go indoors now" is never softened), dropping a weaker
// way of saying the same thing.
const escalate = (actions: EnviActionId[]): EnviActionId[] => {
  if (actions.some(id => ENVI_ESCALATION.alreadyCovered.includes(id))) return actions;
  const rest = actions
    .slice(1)
    .filter(id => id !== ENVI_ESCALATION.action && !ENVI_ESCALATION.supersedes.includes(id));
  return [ENVI_ESCALATION.action, ...rest];
};

// The person's top tip on the card: in place of the general tile it says
// more precisely ("Drink before thirsty" for "Drink water"), else in a free
// slot, else in place of the last tile.
const withTip = (actions: EnviActionId[], tip: EnviPersonTip): EnviActionId[] => {
  if (actions.includes(tip.action)) return actions;
  if (tip.refines && actions.includes(tip.refines)) {
    return actions.map(id => (id === tip.refines ? tip.action : id));
  }
  if (actions.length < ENVI_KEYWORD_LIMITS.maxTiles) return [...actions, tip.action];
  return [...actions.slice(0, -1), tip.action];
};

// One more tip in the sheet, which has no tile limit: in place of the
// sentence it refines, else after the rest — so "Drink water" and "Drink
// before thirsty" are never both said.
const withSheetTip = (sentences: EnviActionId[], tip: EnviPersonTip): EnviActionId[] => {
  if (sentences.includes(tip.action)) return sentences;
  if (tip.refines && sentences.includes(tip.refines)) {
    return sentences.map(id => (id === tip.refines ? tip.action : id));
  }
  return [...sentences, tip.action];
};

// The keywords on the Environmental Index card (and, as full sentences, in
// its recommendations sheet). Like the level itself, they never say which
// hazard set the level — chips name a risk, tiles an action.
// - No readings: nothing. Level 1: one calm tile, the same for everyone.
// - Both hazards high: both chips, and the fixed combined tiles for where
//   the person is — never the two lists merged, which would put "rest in
//   the shade" next to "keep windows closed".
// - Otherwise the higher hazard's chip and tiles for where the person is;
//   on a tie, the season's hazard (leadHazard). `nowMs` only settles that.
// Then, for the owner: someone more at risk who is outdoors from
// ENVI_ESCALATION.minLevel gets "Go indoors soon" first; their most
// important tip takes one tile; the rest of their tips go to the sheet.
export const enviKeywordsFor = (
  current: HazardReadings,
  nowMs: number = Date.now(),
  advice: EnviAdviceFor = GENERAL_ADVICE_FOR,
): EnviKeywords => {
  const { person, context } = advice;
  const none: EnviKeywords = { warnings: [], actions: [], sheetActions: [], medicineNote: false };
  const envi = getEnviLevel(current);
  if (envi === null) return none;
  if (envi === 1) {
    return { ...none, actions: [...ENVI_CALM_ACTIONS], sheetActions: [...ENVI_CALM_ACTIONS] };
  }

  const levels = levelsOf(current);
  let warnings: string[];
  let actions: EnviActionId[];
  if (isHigh(levels)) {
    warnings = HAZARD_KINDS.map(
      hazard => ENVI_WARNING_COPY[hazard][levelOf(hazard, current[hazard] as number)],
    );
    actions = [...ENVI_DUAL_ACTIONS[context]];
  } else {
    const lead = leadHazard(current, nowMs);
    const value = current[lead];
    // The lead is always an available hazard at ENVI's level (≥ 2 here), so
    // both lookups find an entry; the guards only keep a gap in the tables
    // from crashing the card.
    if (value === null) return none;
    const level = levelOf(lead, value);
    const warning = ENVI_WARNING_COPY[lead][level];
    warnings = warning ? [warning] : [];
    actions = [...(ENVI_HAZARD_ACTIONS[lead][level]?.[context] ?? [])];
  }
  actions = actions.slice(0, ENVI_KEYWORD_LIMITS.maxTiles);

  if (context === 'outdoors' && envi >= ENVI_ESCALATION.minLevel && isMoreAtRisk(person)) {
    actions = escalate(actions);
  }
  const tips = personTipsFor(person, levels);
  if (tips.length > 0) actions = withTip(actions, tips[0]);

  return {
    warnings,
    actions,
    sheetActions: tips.slice(1).reduce(withSheetTip, actions),
    medicineNote:
      person.takesRegularMedicine && (levels.heat ?? 0) >= ENVI_MEDICINE_NOTE_MIN_HEAT_LEVEL,
  };
};
