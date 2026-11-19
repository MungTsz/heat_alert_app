import {
  DEFAULT_ALERT_PERSON,
  DEFAULT_PLACE_ALERT_PROFILE,
  NEW_PLACE_ALERT_PROFILE,
} from '../../config/alertConfig';
import { AlertPerson, PlaceAlertProfile } from '../../types/alerts';
import {
  alertLevelFor,
  hasLevelOverride,
  normalizeIdentities,
  personAlertLevelFor,
  resolveAlertProfile,
  resolvePlaceAlertProfile,
  summarizeAlertLevels,
  summarizeAlertProfile,
  summarizeDailyLife,
  toggleIdentity,
  withAlertLevel,
  withCaringFor,
  withPlacePerson,
  withoutReview,
} from '../alertProfile';

const general = DEFAULT_PLACE_ALERT_PROFILE;
const person = (over: Partial<AlertPerson>): AlertPerson => ({ ...DEFAULT_ALERT_PERSON, ...over });
const aboutYouOutdoor = person({ dailyActivity: 'outdoors' });
const aboutYouAsthma = person({ identities: ['asthma'] });

describe('identities', () => {
  it('ticking a group unticks General adult, and General adult unticks the rest', () => {
    expect(toggleIdentity(['general'], 'pregnant')).toEqual(['pregnant']);
    expect(toggleIdentity(['pregnant'], 'asthma')).toEqual(['pregnant', 'asthma']);
    expect(toggleIdentity(['pregnant', 'asthma'], 'general')).toEqual(['general']);
  });

  it('unticking the last group goes back to General adult', () => {
    expect(toggleIdentity(['asthma'], 'asthma')).toEqual(['general']);
    expect(toggleIdentity(['older', 'asthma'], 'older')).toEqual(['asthma']);
  });

  it('normalizes stored answers: known, once, in list order, never empty', () => {
    expect(normalizeIdentities(undefined)).toEqual(['general']);
    expect(normalizeIdentities([])).toEqual(['general']);
    expect(normalizeIdentities(['asthma', 'older', 'asthma'])).toEqual(['older', 'asthma']);
    expect(normalizeIdentities(['general', 'pregnant'])).toEqual(['pregnant']);
  });
});

describe('alert levels from the answers', () => {
  it('a general adult, mostly indoors, alerts at the general levels', () => {
    expect(personAlertLevelFor(DEFAULT_ALERT_PERSON, 'heat')).toBe('Danger');
    expect(personAlertLevelFor(DEFAULT_ALERT_PERSON, 'aqhi')).toBe('Very High');
  });

  it('takes the most careful level of all the identities ticked', () => {
    const p = person({ identities: ['pregnant', 'asthma'] });
    expect(personAlertLevelFor(p, 'heat')).toBe('Extreme Caution');
    expect(personAlertLevelFor(p, 'aqhi')).toBe('High');
  });

  it('regular medicine moves the heat level to the long-term-condition one, not AQHI', () => {
    const p = person({ takesRegularMedicine: true });
    expect(personAlertLevelFor(p, 'heat')).toBe(personAlertLevelFor(person({ identities: ['otherChronic'] }), 'heat'));
    expect(personAlertLevelFor(p, 'aqhi')).toBe('Very High');
  });

  it('often outdoors keeps the old outdoor-work levels', () => {
    expect(personAlertLevelFor(aboutYouOutdoor, 'heat')).toBe('Extreme Caution');
    expect(personAlertLevelFor(aboutYouOutdoor, 'aqhi')).toBe('Very High');
  });

  it('a child at a place alerts like an older adult', () => {
    const child = person({ identities: ['child'] });
    const older = person({ identities: ['older'] });
    expect(personAlertLevelFor(child, 'heat')).toBe(personAlertLevelFor(older, 'heat'));
    expect(personAlertLevelFor(child, 'aqhi')).toBe(personAlertLevelFor(older, 'aqhi'));
  });
});

describe('resolvePlaceAlertProfile', () => {
  it('a new place for yourself uses all your About you answers', () => {
    const p = resolvePlaceAlertProfile(NEW_PLACE_ALERT_PROFILE, aboutYouOutdoor);
    expect(p.dailyActivity).toBe('outdoors');
    expect(p.identities).toEqual(['general']);
    expect(p.followsAboutYou).toBe(true);
  });

  it('follows a later About you change without re-saving the place', () => {
    const saved = resolvePlaceAlertProfile(NEW_PLACE_ALERT_PROFILE, aboutYouOutdoor);
    const later = resolvePlaceAlertProfile(saved, person({ identities: ['heartLung'], takesRegularMedicine: true }));
    expect(later.identities).toEqual(['heartLung']);
    expect(later.takesRegularMedicine).toBe(true);
    expect(later.dailyActivity).toBe('indoors');
  });

  it('keeps a place’s own answers and a family place’s answers', () => {
    const own: PlaceAlertProfile = { ...general, identities: ['older'], followsAboutYou: false };
    expect(resolvePlaceAlertProfile(own, aboutYouOutdoor).identities).toEqual(['older']);
    const mum: PlaceAlertProfile = { ...general, caringFor: 'family' };
    const resolvedMum = resolvePlaceAlertProfile(mum, aboutYouOutdoor);
    expect(resolvedMum.dailyActivity).toBe('indoors');
    expect(resolvedMum.followsAboutYou).toBe(false);
  });

  it('older saves: a place for yourself left on General adult follows About you', () => {
    expect(resolvePlaceAlertProfile(undefined, aboutYouOutdoor).dailyActivity).toBe('outdoors');
    expect(resolvePlaceAlertProfile(general, aboutYouOutdoor).dailyActivity).toBe('outdoors');
    // Any other answer was a real choice for that place.
    const chose: PlaceAlertProfile = { ...general, identities: ['older'] };
    expect(resolvePlaceAlertProfile(chose, aboutYouOutdoor).identities).toEqual(['older']);
  });

  it('old one-choice saves: converted, and a guessed family answer asks to be checked', () => {
    const mum = resolvePlaceAlertProfile(
      { audience: 'sensitive', caringFor: 'family', hazards: { heat: true, aqhi: true } },
      aboutYouOutdoor,
    );
    expect(mum.identities).toEqual(['older']);
    expect(mum.needsReview).toBe(true);
    expect(summarizeAlertProfile(mum)).toBe('Please check who is here');
  });

  it('a place that follows About you has nothing of its own to check', () => {
    const old = resolvePlaceAlertProfile({ audience: 'general', caringFor: 'self' }, aboutYouAsthma);
    expect(old.followsAboutYou).toBe(true);
    expect(old).not.toHaveProperty('needsReview');
  });
});

describe('withCaringFor / withPlacePerson', () => {
  const mine = resolvePlaceAlertProfile(NEW_PLACE_ALERT_PROFILE, aboutYouOutdoor);

  it('switching to "for myself" starts from the About you answers', () => {
    const family: PlaceAlertProfile = { ...mine, caringFor: 'family', identities: ['child'] };
    const back = withCaringFor(family, 'self', aboutYouOutdoor);
    expect(back.identities).toEqual(['general']);
    expect(back.dailyActivity).toBe('outdoors');
    expect(back.followsAboutYou).toBe(true);
  });

  it('switching to family stops following and keeps the answers', () => {
    const family = withCaringFor(mine, 'family', aboutYouOutdoor);
    expect(family.followsAboutYou).toBe(false);
    expect(family.dailyActivity).toBe('outdoors');
  });

  it('other answers give a place for yourself its own', () => {
    const own = withPlacePerson(mine, person({ identities: ['older'] }), aboutYouOutdoor);
    expect(own.followsAboutYou).toBe(false);
    expect(resolvePlaceAlertProfile(own, aboutYouAsthma).identities).toEqual(['older']);
  });

  it('answering exactly as About you means "same as me" again', () => {
    const own = withPlacePerson(mine, person({ identities: ['older'] }), aboutYouOutdoor);
    const back = withPlacePerson(own, aboutYouOutdoor, aboutYouOutdoor);
    expect(back.followsAboutYou).toBe(true);
  });

  it('a family place never follows, even with the same answers', () => {
    const family = withCaringFor(mine, 'family', aboutYouOutdoor);
    expect(withPlacePerson(family, aboutYouOutdoor, aboutYouOutdoor).followsAboutYou).toBe(false);
  });
});

describe('needsReview', () => {
  it('is kept through resolving and dropped by saving', () => {
    const flagged = resolveAlertProfile({ audience: 'chronic' });
    expect(flagged.needsReview).toBe(true);
    expect(withoutReview(flagged)).not.toHaveProperty('needsReview');
    // A saved (reviewed) profile stays reviewed.
    expect(resolveAlertProfile(withoutReview(flagged))).not.toHaveProperty('needsReview');
  });
});

describe('withAlertLevel', () => {
  it('sets an override for a level other than the answers’ own', () => {
    const p = withAlertLevel(general, 'aqhi', 'High');
    expect(p.levelOverride).toEqual({ aqhi: 'High' });
    expect(alertLevelFor(p, 'aqhi')).toBe('High');
  });

  it('picking the answers’ own level clears the override instead of storing it', () => {
    const changed = withAlertLevel(general, 'aqhi', 'High');
    const back = withAlertLevel(changed, 'aqhi', 'Very High');
    expect(back).not.toHaveProperty('levelOverride');
    expect(hasLevelOverride(back, 'aqhi')).toBe(false);
  });

  it('resets one hazard without touching the other', () => {
    const both = withAlertLevel(withAlertLevel(general, 'aqhi', 'High'), 'heat', 'Extreme Danger');
    const reset = withAlertLevel(both, 'aqhi', null);
    expect(reset.levelOverride).toEqual({ heat: 'Extreme Danger' });
  });

  it('a reset level follows a later answer change', () => {
    const p = withAlertLevel(withAlertLevel(general, 'aqhi', 'High'), 'aqhi', null);
    expect(alertLevelFor({ ...p, identities: ['older'] }, 'aqhi')).toBe('High');
    expect(alertLevelFor({ ...p, identities: ['general'] }, 'aqhi')).toBe('Very High');
  });
});

describe('summaries', () => {
  it('lists the level in effect for each hazard, overrides included', () => {
    expect(summarizeAlertLevels(general)).toBe('Heat index Danger · Air quality Very High');
    expect(summarizeAlertLevels(withAlertLevel(general, 'aqhi', 'High'))).toBe(
      'Heat index Danger · Air quality High',
    );
  });

  it('marks a switched-off hazard, or all alerts off', () => {
    expect(summarizeAlertLevels({ ...general, hazards: { heat: false, aqhi: true } })).toBe(
      'Heat index off · Air quality Very High',
    );
    expect(summarizeAlertLevels({ ...general, hazards: { heat: false, aqhi: false } })).toBe(
      'Alerts off',
    );
  });

  it('names every identity, then the everyday answers', () => {
    const p: PlaceAlertProfile = {
      ...general,
      identities: ['asthma', 'pregnant'],
      caringFor: 'family',
      takesRegularMedicine: true,
      dailyActivity: 'outdoors',
    };
    expect(summarizeAlertProfile(p)).toBe('Pregnant, Asthma · For family or others');
    expect(summarizeDailyLife(p)).toBe('Often outdoors · Regular medicine');
    expect(summarizeDailyLife(general)).toBe('Mostly indoors');
  });
});
