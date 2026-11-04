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
