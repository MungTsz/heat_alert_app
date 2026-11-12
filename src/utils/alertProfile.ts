// src/utils/alertProfile.ts
import { AudienceGroup, CaringFor, HazardKind, PlaceAlertProfile } from '../types/alerts';
import {
  AUDIENCE_ALERT_LEVELS,
  DEFAULT_PLACE_ALERT_PROFILE,
  HAZARD_KINDS,
  URGENT_LEVELS,
} from '../config/alertConfig';
import {
  AUDIENCE_COPY,
  CARING_FOR_COPY,
  HAZARD_COPY,
  LEVEL_SUMMARY_COPY,
  PLACE_ALERT_SUMMARY_COPY,
} from '../config/alertCopy';
import { rankOfLevel } from './hazardLevels';

// A stored profile with every field filled in. Bookmarks saved before
// profiles existed (or saved by a future version with extra hazards) still
// get a complete, valid profile without a storage migration.
export const resolveAlertProfile = (
  profile: Partial<PlaceAlertProfile> | undefined,
): PlaceAlertProfile => ({
  ...DEFAULT_PLACE_ALERT_PROFILE,
  ...profile,
  hazards: { ...DEFAULT_PLACE_ALERT_PROFILE.hazards, ...profile?.hazards },
});

// A saved place's profile, complete, with its audience taken from "About
// you" when the place is for yourself and hasn't been given its own — the
// owner's identity lives in one place only.
export const resolvePlaceAlertProfile = (
  stored: Partial<PlaceAlertProfile> | undefined,
  aboutYou: PlaceAlertProfile,
): PlaceAlertProfile => {
  const profile = resolveAlertProfile(stored);
  // Saved before followsAboutYou existed: a place for yourself left on the
  // General adult default was never really answered (the old flow
  // preselected it), so it follows About you; any other choice was a real
  // answer and is kept.
  const follows =
    profile.caringFor === 'self' &&
    (stored?.followsAboutYou ?? profile.audience === DEFAULT_PLACE_ALERT_PROFILE.audience);
  return follows
    ? { ...profile, followsAboutYou: true, audience: aboutYou.audience }
    : { ...profile, followsAboutYou: false };
};

// "For myself" means "the same as me" until shown otherwise, so switching
// to it always starts from the About you answer; switching to family keeps
// whatever is picked, for the person to confirm in the list it reveals.
export const withCaringFor = (
  profile: PlaceAlertProfile,
  caringFor: CaringFor,
  aboutYouAudience: AudienceGroup,
): PlaceAlertProfile =>
  caringFor === 'self'
    ? { ...profile, caringFor, followsAboutYou: true, audience: aboutYouAudience }
    : { ...profile, caringFor, followsAboutYou: false };

// Picks who is at a place. Picking your own About you answer at a place for
// yourself means "same as me" again — one representation, like
// withAlertLevel, so a later About you change still reaches this place.
export const withPlaceAudience = (
  profile: PlaceAlertProfile,
  audience: AudienceGroup,
  aboutYouAudience: AudienceGroup,
): PlaceAlertProfile => ({
  ...profile,
  audience,
  followsAboutYou: profile.caringFor === 'self' && audience === aboutYouAudience,
});

// The level this place starts alerting at: the Advanced override if set,
// otherwise its audience's default.
export const alertLevelFor = (
  profile: PlaceAlertProfile,
  hazard: HazardKind,
): string =>
  profile.levelOverride?.[hazard] ?? AUDIENCE_ALERT_LEVELS[profile.audience][hazard];

export const hasLevelOverride = (profile: PlaceAlertProfile, hazard: HazardKind): boolean =>
  profile.levelOverride?.[hazard] !== undefined;

// Sets the Advanced level for one hazard (null = back to the audience's).
// Picking the audience's own level also clears the override, so "follows
// who is here" has a single representation and a later audience change
// still moves the level with it. Callers only offer that hazard's
// ADVANCED_LEVEL_CHOICES, so the level is valid for it.
export const withAlertLevel = (
  profile: PlaceAlertProfile,
  hazard: HazardKind,
  level: string | null,
): PlaceAlertProfile => {
  const levelOverride: Record<string, string> = { ...profile.levelOverride };
  if (level === null || level === AUDIENCE_ALERT_LEVELS[profile.audience][hazard]) {
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

// One line for a place card, e.g. "Older adult, child or pregnant · For
// family or others", or "Alerts off" when both hazards are switched off.
export const summarizeAlertProfile = (profile: PlaceAlertProfile): string =>
  HAZARD_KINDS.some(h => profile.hazards[h])
    ? PLACE_ALERT_SUMMARY_COPY.summary(
        AUDIENCE_COPY[profile.audience].label,
        CARING_FOR_COPY[profile.caringFor],
      )
    : PLACE_ALERT_SUMMARY_COPY.off;
