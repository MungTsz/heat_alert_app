// src/utils/alertProfile.ts
import { HazardKind, PlaceAlertProfile } from '../types/alerts';
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
