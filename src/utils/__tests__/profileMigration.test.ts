import { HAZARD_KINDS } from '../../config/alertConfig';
import { AlertDetailItem } from '../../types/alerts';
import { alertLevelFor, resolveAlertProfile } from '../alertProfile';
import {
  LegacyAudienceGroup,
  migrateStoredDetailItem,
  migrateStoredProfile,
} from '../profileMigration';

// The levels each old one-choice answer alerted at, before the questions
// changed. Written out rather than read from config on purpose: the point
// is that conversion keeps exactly these, whatever the tables say now.
const OLD_LEVELS: Record<LegacyAudienceGroup, { heat: string; aqhi: string }> = {
  general: { heat: 'Danger', aqhi: 'Very High' },
  sensitive: { heat: 'Extreme Caution', aqhi: 'High' },
  chronic: { heat: 'Extreme Caution', aqhi: 'High' },
  outdoor: { heat: 'Extreme Caution', aqhi: 'Very High' },
};

describe('migrateStoredProfile', () => {
  it('converts each old answer to the new questions', () => {
    expect(migrateStoredProfile({ audience: 'general' })).toEqual({
      identities: ['general'],
      takesRegularMedicine: false,
      dailyActivity: 'indoors',
    });
    expect(migrateStoredProfile({ audience: 'sensitive' })).toEqual({
      identities: ['older'],
      takesRegularMedicine: false,
      dailyActivity: 'indoors',
      needsReview: true,
    });
    expect(migrateStoredProfile({ audience: 'chronic' })).toEqual({
      identities: ['heartLung'],
      takesRegularMedicine: false,
      dailyActivity: 'indoors',
      needsReview: true,
    });
    expect(migrateStoredProfile({ audience: 'outdoor' })).toEqual({
      identities: ['general'],
      takesRegularMedicine: false,
      dailyActivity: 'outdoors',
    });
  });

  it('never moves an existing user’s alert levels', () => {
    (Object.keys(OLD_LEVELS) as LegacyAudienceGroup[]).forEach(audience => {
      const profile = resolveAlertProfile({ audience });
      HAZARD_KINDS.forEach(hazard =>
        expect(alertLevelFor(profile, hazard)).toBe(OLD_LEVELS[audience][hazard]),
      );
    });
  });

  it('keeps everything else the old profile had', () => {
    expect(
      migrateStoredProfile({
        audience: 'sensitive',
        caringFor: 'family',
        hazards: { heat: false, aqhi: true },
        levelOverride: { aqhi: 'Very High' },
      }),
    ).toMatchObject({
      caringFor: 'family',
      hazards: { heat: false, aqhi: true },
      levelOverride: { aqhi: 'Very High' },
    });
  });

  it('passes a profile already in the new shape through unchanged', () => {
    const current = {
      identities: ['asthma' as const],
      takesRegularMedicine: true,
      dailyActivity: 'outdoors' as const,
    };
    expect(migrateStoredProfile(current)).toEqual(current);
    // A stray old answer next to new ones never overrides them.
    expect(migrateStoredProfile({ ...current, audience: 'chronic' })).toEqual(current);
    expect(migrateStoredProfile(undefined)).toBeUndefined();
  });
});

describe('migrateStoredDetailItem', () => {
  const base = {
    eventKey: 'mum|heat',
    placeId: 'mum',
    placeLabel: "Mum's home",
    latitude: null,
    longitude: null,
    hazard: 'heat' as const,
    stage: 'active' as const,
    value: 41,
    rank: 3,
    forecast: null,
    caringFor: 'family' as const,
  };

  it('gives a message sent before the update its answers, so its advice still reads', () => {
    const item = migrateStoredDetailItem({ ...base, audience: 'sensitive' });
    expect(item).not.toHaveProperty('audience');
    expect(item.identities).toEqual(['older']);
    expect(item.caringFor).toBe('family');
  });

  it('leaves a new item as it is', () => {
    const item: AlertDetailItem = {
      ...base,
      identities: ['pregnant'],
      takesRegularMedicine: true,
      dailyActivity: 'indoors',
    };
    expect(migrateStoredDetailItem(item)).toEqual(item);
  });
});
