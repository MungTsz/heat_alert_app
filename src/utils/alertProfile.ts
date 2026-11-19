// src/utils/alertProfile.ts
import {
  AdviceGroup,
  AlertPerson,
  CaringFor,
  HazardKind,
  IdentityGroup,
  PlaceAlertProfile,
} from '../types/alerts';
import {
  ADVICE_GROUP_PRECEDENCE,
  DAILY_ACTIVITY_ADVICE_GROUP,
  DAILY_ACTIVITY_ALERT_LEVELS,
  DEFAULT_ALERT_PERSON,
  DEFAULT_PLACE_ALERT_PROFILE,
  HAZARD_KINDS,
  IDENTITY_ADVICE_GROUP,
  IDENTITY_ALERT_LEVELS,
  MEDICINE_ADVICE_GROUP,
  MEDICINE_ALERT_LEVELS,
  PLACE_IDENTITY_GROUPS,
  URGENT_LEVELS,
} from '../config/alertConfig';
import {
  CARING_FOR_COPY,
  DAILY_ACTIVITY_COPY,
  HAZARD_COPY,
  IDENTITY_COPY,
  LEVEL_SUMMARY_COPY,
  PERSON_SUMMARY_COPY,
  PLACE_ALERT_SUMMARY_COPY,
} from '../config/alertCopy';
import { rankOfLevel } from './hazardLevels';
import { StoredAlertProfile, migrateStoredProfile } from './profileMigration';

// ---- Identities ------------------------------------------------------------

// A valid identities answer: known values only, each once, in the order the
// pickers list them (so two equal answers compare equal), General adult only
// on its own, and never empty — nothing ticked means General adult.
export const normalizeIdentities = (
  identities: readonly IdentityGroup[] | undefined,
): IdentityGroup[] => {
  const picked = PLACE_IDENTITY_GROUPS.filter(id => identities?.includes(id));
  const specific = picked.filter(id => id !== 'general');
  return specific.length > 0 ? specific : ['general'];
};

// One tap in the multi-select. Ticking any group unticks General adult;
// ticking General adult unticks the rest (it means "none of these");
// unticking the last group goes back to General adult.
export const toggleIdentity = (
  identities: readonly IdentityGroup[],
  id: IdentityGroup,
): IdentityGroup[] => {
  if (id === 'general') return ['general'];
  return identities.includes(id)
    ? normalizeIdentities(identities.filter(other => other !== id))
    : normalizeIdentities([...identities.filter(other => other !== 'general'), id]);
};

// ---- Person ----------------------------------------------------------------

export const personOf = (person: AlertPerson): AlertPerson => ({
  identities: person.identities,
  takesRegularMedicine: person.takesRegularMedicine,
  dailyActivity: person.dailyActivity,
});

export const samePerson = (a: AlertPerson, b: AlertPerson): boolean =>
  a.takesRegularMedicine === b.takesRegularMedicine &&
  a.dailyActivity === b.dailyActivity &&
  normalizeIdentities(a.identities).join() === normalizeIdentities(b.identities).join();

// ---- Stored profiles -------------------------------------------------------

// Drops the "please check" flag — saving a profile is the check.
export const withoutReview = (profile: PlaceAlertProfile): PlaceAlertProfile => {
  const next = { ...profile };
  delete next.needsReview;
  return next;
};

// A stored profile with every field filled in. Bookmarks saved before
// profiles existed, profiles in the old one-audience shape (converted by
// profileMigration), and saves from a future version with extra hazards all
// get a complete, valid profile without a storage migration.
export const resolveAlertProfile = (
  stored: StoredAlertProfile | undefined,
): PlaceAlertProfile => {
  const migrated = migrateStoredProfile(stored);
  const profile: PlaceAlertProfile = {
    ...DEFAULT_PLACE_ALERT_PROFILE,
    ...migrated,
    identities: normalizeIdentities(migrated?.identities),
    hazards: { ...DEFAULT_PLACE_ALERT_PROFILE.hazards, ...migrated?.hazards },
  };
  return profile.needsReview ? profile : withoutReview(profile);
};

// A saved place's profile, complete, with its person taken from "About
// you" when the place is for yourself and hasn't been given its own — the
// owner's answers live in one place only.
export const resolvePlaceAlertProfile = (
  stored: StoredAlertProfile | undefined,
  aboutYou: AlertPerson,
): PlaceAlertProfile => {
  const profile = resolveAlertProfile(stored);
  // Saved before followsAboutYou existed: a place for yourself left on the
  // General adult default was never really answered (the old flow
  // preselected it), so it follows About you; any other choice was a real
  // answer and is kept.
  const follows =
    profile.caringFor === 'self' &&
    (stored?.followsAboutYou ?? samePerson(profile, DEFAULT_ALERT_PERSON));
  return follows
    ? // Nothing to check here: its answers are About you's.
      { ...withoutReview(profile), ...personOf(aboutYou), followsAboutYou: true }
    : { ...profile, followsAboutYou: false };
};

// "For myself" means "the same as me" until shown otherwise, so switching
// to it always starts from the About you answers; switching to family keeps
// whatever is picked, for the person to confirm in the questions it reveals.
export const withCaringFor = (
  profile: PlaceAlertProfile,
  caringFor: CaringFor,
  aboutYou: AlertPerson,
): PlaceAlertProfile =>
  caringFor === 'self'
    ? { ...profile, ...personOf(aboutYou), caringFor, followsAboutYou: true }
    : { ...profile, caringFor, followsAboutYou: false };

// Sets who is at a place. Answering exactly as About you at a place for
// yourself means "same as me" again — one representation, like
// withAlertLevel, so a later About you change still reaches this place.
export const withPlacePerson = (
  profile: PlaceAlertProfile,
  person: AlertPerson,
  aboutYou: AlertPerson,
): PlaceAlertProfile => ({
  ...profile,
  ...personOf(person),
  followsAboutYou: profile.caringFor === 'self' && samePerson(person, aboutYou),
});

// ---- Alert levels ----------------------------------------------------------

// The level a person's answers start alerts at for one hazard: the most
// careful (lowest) level any identity, the medicine answer or the daily
// pattern asks for. General adult's level seeds it — every other answer is
// at least as careful — so a hazard no answer mentions still has a level.
export const personAlertLevelFor = (person: AlertPerson, hazard: HazardKind): string => {
  const candidates = [
    ...normalizeIdentities(person.identities).map(id => IDENTITY_ALERT_LEVELS[id][hazard]),
    person.takesRegularMedicine ? MEDICINE_ALERT_LEVELS[hazard] : undefined,
    DAILY_ACTIVITY_ALERT_LEVELS[person.dailyActivity][hazard],
  ].filter((level): level is NonNullable<typeof level> => level !== undefined);
  return candidates.reduce<string>(
    (most, level) => (rankOfLevel(hazard, level) < rankOfLevel(hazard, most) ? level : most),
    IDENTITY_ALERT_LEVELS.general[hazard],
  );
};

// The level this place starts alerting at: the Advanced override if set,
// otherwise its answers' level.
export const alertLevelFor = (profile: PlaceAlertProfile, hazard: HazardKind): string =>
  profile.levelOverride?.[hazard] ?? personAlertLevelFor(profile, hazard);

export const hasLevelOverride = (profile: PlaceAlertProfile, hazard: HazardKind): boolean =>
  profile.levelOverride?.[hazard] !== undefined;

// Sets the Advanced level for one hazard (null = back to the answers').
// Picking the answers' own level also clears the override, so "follows
// who is here" has a single representation and a later answer change
// still moves the level with it. Callers only offer that hazard's
// ADVANCED_LEVEL_CHOICES, so the level is valid for it.
export const withAlertLevel = (
  profile: PlaceAlertProfile,
  hazard: HazardKind,
  level: string | null,
): PlaceAlertProfile => {
  const levelOverride: Record<string, string> = { ...profile.levelOverride };
  if (level === null || level === personAlertLevelFor(profile, hazard)) {
    delete levelOverride[hazard];
  } else {
    levelOverride[hazard] = level;
  }
  const next: PlaceAlertProfile = { ...profile };
  if (Object.keys(levelOverride).length > 0) {
    next.levelOverride = levelOverride as PlaceAlertProfile['levelOverride'];
  } else {
    delete next.levelOverride;
  }
  return next;
};

// "Heat index Danger · Air quality Very High" — the levels this profile
// alerts at, overrides included, for a collapsed settings row.
export const summarizeAlertLevels = (profile: PlaceAlertProfile): string =>
  HAZARD_KINDS.some(h => profile.hazards[h])
    ? HAZARD_KINDS.map(h =>
        profile.hazards[h]
          ? LEVEL_SUMMARY_COPY.level(HAZARD_COPY[h].name, alertLevelFor(profile, h))
          : LEVEL_SUMMARY_COPY.off(HAZARD_COPY[h].name),
      ).join(LEVEL_SUMMARY_COPY.separator)
    : LEVEL_SUMMARY_COPY.allOff;

export const alertRankFor = (profile: PlaceAlertProfile, hazard: HazardKind): number =>
  rankOfLevel(hazard, alertLevelFor(profile, hazard));

export const urgentRankFor = (hazard: HazardKind): number =>
  rankOfLevel(hazard, URGENT_LEVELS[hazard]);

export const alertEventKey = (placeId: string, hazard: HazardKind): string =>
  `${placeId}|${hazard}`;

// ---- Advice ----------------------------------------------------------------

// Which push advice sentence fits one person for one hazard: of the groups
// their answers ask for, the first in ADVICE_GROUP_PRECEDENCE.
export const adviceGroupFor = (person: AlertPerson, hazard: HazardKind): AdviceGroup => {
  const asked = new Set<AdviceGroup>([
    ...normalizeIdentities(person.identities).map(id => IDENTITY_ADVICE_GROUP[id]),
    DAILY_ACTIVITY_ADVICE_GROUP[person.dailyActivity],
  ]);
  const medicine = person.takesRegularMedicine ? MEDICINE_ADVICE_GROUP[hazard] : undefined;
  if (medicine) asked.add(medicine);
  return ADVICE_GROUP_PRECEDENCE.find(group => asked.has(group)) ?? 'general';
};

// ---- Summaries -------------------------------------------------------------

// "Older adult (65+), Asthma".
export const summarizeIdentities = (identities: readonly IdentityGroup[]): string =>
  normalizeIdentities(identities)
    .map(id => IDENTITY_COPY[id].label)
    .join(PERSON_SUMMARY_COPY.identitySeparator);

// "Often outdoors · Regular medicine" — the two answers besides who.
export const summarizeDailyLife = (person: AlertPerson): string =>
  [
    DAILY_ACTIVITY_COPY[person.dailyActivity].label,
    ...(person.takesRegularMedicine ? [PERSON_SUMMARY_COPY.medicine] : []),
  ].join(PERSON_SUMMARY_COPY.partSeparator);

// One line for a place card, e.g. "Older adult (65+) · For family or
// others", "Alerts off" when both hazards are switched off, or a request to
// check answers converted from the old one-choice question.
export const summarizeAlertProfile = (profile: PlaceAlertProfile): string => {
  if (!HAZARD_KINDS.some(h => profile.hazards[h])) return PLACE_ALERT_SUMMARY_COPY.off;
  if (profile.needsReview) return PLACE_ALERT_SUMMARY_COPY.needsReview;
  return PLACE_ALERT_SUMMARY_COPY.summary(
    summarizeIdentities(profile.identities),
    CARING_FOR_COPY[profile.caringFor],
  );
};
