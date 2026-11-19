// src/utils/profileMigration.ts
import { AlertDetailItem, AlertPerson, PlaceAlertProfile } from '../types/alerts';
import { DEFAULT_ALERT_PERSON } from '../config/alertConfig';

// The one-choice audience stored before identities, medicine and the daily
// pattern were asked separately. Only read here: everything else sees the
// converted answers.
export type LegacyAudienceGroup = 'general' | 'sensitive' | 'chronic' | 'outdoor';

// A profile as it may sit in storage: the current shape, possibly partial
// (older saves lack newer fields), or the old shape with `audience`.
export type StoredAlertProfile = Partial<PlaceAlertProfile> & { audience?: LegacyAudienceGroup };

// Old answer → new answers. Every row keeps exactly the alert levels the
// old answer had (held by tests), so no existing user's alerts move. Two
// rows are guesses — "Older adult, child or pregnant" can't tell which, and
// "Heart, lung or other long-term condition" can't tell asthma from kidney
// disease — so those people are asked once to check (needsReview).
const LEGACY_AUDIENCE_MIGRATION: Record<
  LegacyAudienceGroup,
  { person: AlertPerson; needsReview: boolean }
> = {
  general: { person: DEFAULT_ALERT_PERSON, needsReview: false },
  sensitive: {
    person: { ...DEFAULT_ALERT_PERSON, identities: ['older'] },
    needsReview: true,
  },
  chronic: {
    person: { ...DEFAULT_ALERT_PERSON, identities: ['heartLung'] },
    needsReview: true,
  },
  outdoor: {
    person: { ...DEFAULT_ALERT_PERSON, dailyActivity: 'outdoors' },
    needsReview: false,
  },
};

// Converts a stored profile in the old shape; one already in the new shape
// passes through (minus any stray `audience`). Done on every read rather
// than as a one-off storage rewrite — the same approach as the rest of the
// profile defaults — so a profile is only rewritten when it is next saved.
export const migrateStoredProfile = (
  stored: StoredAlertProfile | undefined,
): Partial<PlaceAlertProfile> | undefined => {
  if (!stored) return undefined;
  const { audience, ...rest } = stored;
  // New shape (or nothing to convert): the identities answer wins.
  if (audience === undefined || rest.identities !== undefined) return rest;
  const legacy = LEGACY_AUDIENCE_MIGRATION[audience] ?? LEGACY_AUDIENCE_MIGRATION.general;
  return {
    ...rest,
    ...legacy.person,
    ...(legacy.needsReview ? { needsReview: true } : {}),
  };
};

// The three AlertPerson answers of something stored with them or with the
// old audience.
const migrateStoredPerson = (
  stored: Partial<AlertPerson> & { audience?: LegacyAudienceGroup },
): AlertPerson => {
  const migrated = migrateStoredProfile(stored);
  return {
    identities: migrated?.identities ?? DEFAULT_ALERT_PERSON.identities,
    takesRegularMedicine:
      migrated?.takesRegularMedicine ?? DEFAULT_ALERT_PERSON.takesRegularMedicine,
    dailyActivity: migrated?.dailyActivity ?? DEFAULT_ALERT_PERSON.dailyActivity,
  };
};

// A delivered message's detail item as it may sit in the message log: the
// log keeps a few days, so items written before the questions changed
// (with `audience`) are still read — and their advice still voiced — after
// an update.
export type StoredDetailItem = Omit<AlertDetailItem, keyof AlertPerson> &
  Partial<AlertPerson> & { audience?: LegacyAudienceGroup };

export const migrateStoredDetailItem = (stored: StoredDetailItem): AlertDetailItem => {
  const item = { ...stored };
  delete item.audience;
  return { ...item, ...migrateStoredPerson(stored) };
};
